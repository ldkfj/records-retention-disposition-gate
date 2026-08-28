import { describe, expect, it } from 'vitest';
import { classifyTransaction } from '../services/transactionClassifier.ts';

const liveSuccess = {
  status: 'FINALIZED',
  result: 6,
  result_name: 'MAJORITY_AGREE',
  consensus_data: { leader_receipt: { execution_result: 'SUCCESS' } },
};

describe('classifyTransaction', () => {
  it('accepts the verified Studio object and array leader receipt shapes', () => {
    expect(classifyTransaction(liveSuccess)).toMatchObject({ finalized: true, success: true });
    expect(classifyTransaction({
      ...liveSuccess,
      consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }, { execution_result: 'SUCCESS' }] },
    })).toMatchObject({ finalized: true, success: true });
  });

  it('preserves supported camelCase transaction shapes', () => {
    expect(classifyTransaction({
      statusName: 'FINALIZED',
      resultName: 'AGREE',
      txExecutionResultName: 'FINISHED_WITH_RETURN',
    })).toMatchObject({ finalized: true, success: true });
  });

  it('fails closed for disagreement, missing evidence, and execution errors', () => {
    expect(classifyTransaction({ ...liveSuccess, result_name: 'DISAGREE', result: 2 })).toMatchObject({ success: false });
    expect(classifyTransaction({ status: 'FINALIZED', consensus_data: liveSuccess.consensus_data })).toMatchObject({ success: false });
    expect(classifyTransaction({ status: 'FINALIZED', result_name: 'MAJORITY_AGREE' })).toMatchObject({ success: false });
    expect(classifyTransaction({
      ...liveSuccess,
      consensus_data: { leader_receipt: { execution_result: 'ERROR' } },
    })).toMatchObject({ success: false, executionError: true });
    expect(classifyTransaction({
      ...liveSuccess,
      txExecutionResultName: 'FINISHED_WITH_RETURN',
      consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }, { execution_result: 'ERROR' }] },
    })).toMatchObject({ success: false, executionError: true });
  });

  it('keeps pending and terminal failed statuses distinct', () => {
    expect(classifyTransaction({ status: 'PENDING' })).toEqual({ finalized: false, failedStatus: false, status: 'PENDING' });
    expect(classifyTransaction({ status: 'REVERTED' })).toEqual({ finalized: false, failedStatus: true, status: 'REVERTED' });
  });
});
