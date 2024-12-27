import {
  FulfillmentDTO,
  OrderDTO,
  OrderWorkflow,
  PaymentCollectionDTO,
} from "@medusajs/framework/types"
import {
  MathBN,
  MedusaError,
  OrderWorkflowEvents,
  deepFlatMap,
} from "@medusajs/framework/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createHook,
  createStep,
  createWorkflow,
  parallelize,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep, useQueryGraphStep } from "../../common"
import { cancelPaymentStep } from "../../payment/steps"
import { deleteReservationsByLineItemsStep } from "../../reservation/steps"
import { cancelOrdersStep } from "../steps/cancel-orders"
import { throwIfOrderIsCancelled } from "../utils/order-validation"
import { createOrderRefundCreditLinesWorkflow } from "./payments/create-order-refund-credit-lines"
import { refundCapturedPaymentsWorkflow } from "./payments/refund-captured-payments"

/**
 * This step validates that an order can be canceled.
 */
export const cancelValidateOrder = createStep(
  "cancel-validate-order",
  ({
    order,
  }: {
    order: OrderDTO
    input: OrderWorkflow.CancelOrderWorkflowInput
  }) => {
    const order_ = order as OrderDTO & {
      payment_collections: PaymentCollectionDTO[]
      fulfillments: FulfillmentDTO[]
    }

    throwIfOrderIsCancelled({ order })

    const throwErrorIf = (
      arr: unknown[],
      pred: (obj: any) => boolean,
      type: string
    ) => {
      if (arr?.some(pred)) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `All ${type} must be canceled before canceling an order`
        )
      }
    }

    const notCanceled = (o) => !o.canceled_at

    throwErrorIf(order_.fulfillments, notCanceled, "fulfillments")
  }
)

export const cancelOrderWorkflowId = "cancel-order"
/**
 * This workflow cancels an order.
 */
export const cancelOrderWorkflow = createWorkflow(
  cancelOrderWorkflowId,
  (input: WorkflowData<OrderWorkflow.CancelOrderWorkflowInput>) => {
    const orderQuery = useQueryGraphStep({
      entity: "orders",
      fields: [
        "id",
        "status",
        "items.id",
        "fulfillments.canceled_at",
        "payment_collections.payments.id",
        "payment_collections.payments.refunds.id",
        "payment_collections.payments.refunds.amount",
        "payment_collections.payments.captures.id",
        "payment_collections.payments.captures.amount",
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart" })

    const order = transform({ orderQuery }, ({ orderQuery }) => {
      return orderQuery.data[0]
    })

    cancelValidateOrder({ order, input })

    const payments = transform({ order }, ({ order }) => {
      const payments = deepFlatMap(
        order,
        "payment_collections.payments",
        ({ payments }) => payments
      )

      const capturedPayments = payments.filter(
        (payment) => payment.captures.length > 0
      )

      const uncapturedPayments = payments.filter(
        (payment) => payment.captures.length === 0
      )

      return {
        capturedPayments,
        uncapturedPayments,
      }
    })

    const totalCaptured = transform({ payments }, ({ payments }) => {
      const paymentCaptures = deepFlatMap(
        payments.capturedPayments,
        "captures",
        ({ captures }) => captures
      )

      return paymentCaptures.reduce(
        (acc, capturedPayment) => MathBN.sum(acc, capturedPayment.amount),
        MathBN.convert(0)
      )
    })

    createOrderRefundCreditLinesWorkflow.runAsStep({
      input: {
        order_id: order.id,
        amount: totalCaptured,
      },
    })

    const uncapturedPaymentIds = transform({ payments }, ({ payments }) => {
      return payments.uncapturedPayments.map((payment) => payment.id)
    })

    const lineItemIds = transform({ order }, ({ order }) => {
      return order.items?.map((i) => i.id)
    })

    parallelize(
      deleteReservationsByLineItemsStep(lineItemIds),
      cancelPaymentStep({ paymentIds: uncapturedPaymentIds }),
      refundCapturedPaymentsWorkflow.runAsStep({
        input: { order_id: order.id },
      }),
      cancelOrdersStep({ orderIds: [order.id] }),
      emitEventStep({
        eventName: OrderWorkflowEvents.CANCELED,
        data: { id: order.id },
      })
    )

    // TODO: Remove after confirming summaries
    const orderQuery2 = useQueryGraphStep({
      entity: "orders",
      fields: ["id", "summary"],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart2" })

    const order2 = transform({ orderQuery2 }, ({ orderQuery2 }) => {
      return orderQuery2.data[0]
    })

    const orderCanceled = createHook("orderCanceled", {
      order: order2,
    })

    return new WorkflowResponse(void 0, {
      hooks: [orderCanceled],
    })
  }
)
