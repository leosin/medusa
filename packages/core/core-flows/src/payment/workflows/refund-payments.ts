import { BigNumberInput, PaymentDTO } from "@medusajs/framework/types"
import { MathBN, MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "../../common"
import { refundPaymentsStep } from "../steps/refund-payments"

type RefundPaymentsInput = {
  payment_id: string
  amount: BigNumberInput
  created_by?: string
}

/**
 * This step validates that the refund is valid for the payment
 */
export const validatePaymentsRefundStep = createStep(
  "validate-payments-refund-step",
  async function ({
    payments,
    input,
  }: {
    payments: PaymentDTO[]
    input: RefundPaymentsInput[]
  }) {
    const paymentIdAmountMap = new Map<string, BigNumberInput>(
      input.map(({ payment_id, amount }) => [payment_id, amount])
    )

    for (const payment of payments) {
      const capturedAmount = (payment.captures || []).reduce(
        (acc, capture) => MathBN.sum(acc, capture.amount),
        MathBN.convert(0)
      )

      const refundedAmount = (payment.refunds || []).reduce(
        (acc, capture) => MathBN.sum(acc, capture.amount),
        MathBN.convert(0)
      )

      const refundableAmount = MathBN.sub(capturedAmount, refundedAmount)
      const amountToRefund = paymentIdAmountMap.get(payment.id)!

      if (MathBN.gt(amountToRefund, refundableAmount)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Payment with id ${payment.id} is trying to refund amount greater than the refundable amount`
        )
      }
    }
  }
)

export const refundPaymentsWorkflowId = "refund-payments-workflow"
/**
 * This workflow refunds a payment.
 */
export const refundPaymentsWorkflow = createWorkflow(
  refundPaymentsWorkflowId,
  (input: WorkflowData<RefundPaymentsInput[]>) => {
    const paymentIds = transform({ input }, ({ input }) =>
      input.map((paymentInput) => paymentInput.payment_id)
    )

    const paymentsQuery = useQueryGraphStep({
      entity: "payments",
      fields: [
        "id",
        "refunds.id",
        "refunds.amount",
        "captures.id",
        "captures.amount",
      ],
      filters: { id: paymentIds },
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart" })

    const payments = transform(
      { paymentsQuery },
      ({ paymentsQuery }) => paymentsQuery.data
    )

    validatePaymentsRefundStep({ payments, input })

    const refundedPayments = refundPaymentsStep(input)

    return new WorkflowResponse(refundedPayments)
  }
)
