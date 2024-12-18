import { BigNumberInput, OrderDTO, PaymentDTO } from "@medusajs/framework/types"
import { deepFlatMap, MathBN, MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  transform,
  when,
  WorkflowData,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "../../../common"
import { refundPaymentsWorkflow } from "../../../payment"

/**
 * This step validates that the refund is valid for the order
 */
export const validateOrderRefundStep = createStep(
  "validate-refund-step",
  async function ({
    order,
    totalCaptured,
  }: {
    order: OrderDTO
    totalCaptured: BigNumberInput
  }) {
    const differenceSum = order.summary?.difference_sum!

    if (MathBN.gte(differenceSum, 0)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order does not have an outstanding balance to refund`
      )
    }

    const postRefundAmount = MathBN.sum(differenceSum, totalCaptured)

    if (!MathBN.eq(postRefundAmount, 0)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Refund amount does not match the difference`
      )
    }
  }
)

export const refundCapturedPaymentsWorkflowId =
  "refund-captured-payments-workflow"
/**
 * This workflow refunds a payment.
 */
export const refundCapturedPaymentsWorkflow = createWorkflow(
  refundCapturedPaymentsWorkflowId,
  (
    input: WorkflowData<{
      order_id: string
      created_by?: string
    }>
  ) => {
    const orderQuery = useQueryGraphStep({
      entity: "orders",
      fields: [
        "id",
        "status",
        "summary",
        "payment_collections.payments.id",
        "payment_collections.payments.refunds.id",
        "payment_collections.payments.refunds.amount",
        "payment_collections.payments.captures.id",
        "payment_collections.payments.captures.amount",
      ],
      filters: { id: input.order_id },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart" })

    const order = transform(
      { orderQuery },
      ({ orderQuery }) => orderQuery.data[0]
    )

    const refundPaymentsData = transform(
      { order, input },
      ({ order, input }) => {
        const payments: PaymentDTO[] = deepFlatMap(
          order,
          "payment_collections.payments",
          ({ payments }) => payments
        )

        const capturedPayments = payments.filter(
          (payment) => payment.captures?.length
        )

        return capturedPayments
          .map((payment) => {
            const capturedAmount = (payment.captures || []).reduce(
              (acc, capture) => MathBN.sum(acc, capture.amount),
              MathBN.convert(0)
            )
            const refundedAmount = (payment.refunds || []).reduce(
              (acc, capture) => MathBN.sum(acc, capture.amount),
              MathBN.convert(0)
            )

            const refundAmount = MathBN.sub(capturedAmount, refundedAmount)

            return {
              payment_id: payment.id,
              created_by: input.created_by,
              amount: refundAmount,
            }
          })
          .filter((payment) => MathBN.gt(payment.amount, 0))
      }
    )

    const totalCaptured = transform(
      { refundPaymentsData },
      ({ refundPaymentsData }) =>
        refundPaymentsData.reduce(
          (acc, refundPayment) => MathBN.sum(acc, refundPayment.amount),
          MathBN.convert(0)
        )
    )

    when({ totalCaptured }, ({ totalCaptured }) => {
      return !!MathBN.gt(totalCaptured, 0)
    }).then(() => {
      validateOrderRefundStep({ order, totalCaptured })

      refundPaymentsWorkflow.runAsStep({ input: refundPaymentsData })
    })
  }
)
