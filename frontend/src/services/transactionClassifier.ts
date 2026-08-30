export type FinalizedTransactionClassification =
  | { finalized: false; failedStatus: boolean; status: string }
  | { finalized: true; success: boolean; executionError: boolean; consensus: string; execution: string };

const upper = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).toUpperCase();

export function classifyTransaction(tx: any): FinalizedTransactionClassification {
  const status = upper(tx?.statusName ?? tx?.transactionStatusName ?? tx?.status);
  if (status !== 'FINALIZED' && status !== '7') {
    return {
      finalized: false,
      failedStatus: status === 'CANCELED' || status === 'ERROR' || status === 'REVERTED',
      status,
    };
  }

  const consensus = upper(
    tx?.resultName ?? tx?.result_name ?? tx?.consensusResult ?? tx?.consensus ??
      (Number(tx?.result) === 6 ? 'MAJORITY_AGREE' : tx?.result)
  );
  const receipts = tx?.consensus_data?.leader_receipt;
  const receiptList = receipts ? (Array.isArray(receipts) ? receipts : [receipts]) : [];
  const leaderReceipts = receiptList.some((receipt: any) => upper(receipt?.mode) === 'LEADER')
    ? receiptList.filter((receipt: any) => upper(receipt?.mode) === 'LEADER')
    : receiptList;
  const executions = [
    tx?.txExecutionResultName,
    tx?.execution_result,
    tx?.executionResult,
    ...leaderReceipts.map((receipt: any) => receipt?.execution_result ?? receipt?.executionResult),
  ]
    .map(upper)
    .filter(Boolean);

  if (tx?.txExecutionResult !== undefined) {
    const numeric = Number(tx.txExecutionResult);
    if (numeric === 1) executions.push('FINISHED_WITH_RETURN');
    if (numeric === 2 || numeric === 3) executions.push('FINISHED_WITH_ERROR');
  }

  const executionError = executions.some((value) =>
    value === 'ERROR' || value === 'FINISHED_WITH_ERROR'
  );
  const executionSuccess = executions.some((value) =>
    value === 'SUCCESS' || value === 'FINISHED_WITH_RETURN'
  );
  const consensusSuccess = consensus === 'AGREE' || consensus === 'MAJORITY_AGREE';

  return {
    finalized: true,
    success: consensusSuccess && executionSuccess && !executionError,
    executionError,
    consensus,
    execution: executions.join(','),
  };
}
