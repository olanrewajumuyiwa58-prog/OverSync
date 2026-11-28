import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TransactionHistory from './TransactionHistory';

// The coordinator adapter and refund dialog pull in wallet SDK modules that
// are unrelated to link rendering. Stub them so the transaction explorer
// links can be exercised on their own.
vi.mock('../lib/orderRecovery', () => ({
  isRealHash: (hash: string) => Boolean(hash),
  isRealTransaction: (tx: unknown) => Boolean(tx),
  mapCoordinatorOrderToTransaction: () => null,
}));
vi.mock('../features/refund/RefundDialog', () => ({ default: () => null }));

const SAFE_REL = 'noopener noreferrer';
const ETH_HASH = '0x' + 'a'.repeat(64);
const STELLAR_HASH = 'b'.repeat(64);
const REFUND_HASH = '0x' + 'c'.repeat(64);

function expectProtectedLink(link: HTMLElement | null) {
  expect(link).not.toBeNull();
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', SAFE_REL);
  const tokens = (link?.getAttribute('rel') ?? '').split(/\s+/);
  expect(tokens).toContain('noopener');
  expect(tokens).toContain('noreferrer');
}

describe('transaction history explorer links', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps lock, claim and refund URLs and labels on protected links', async () => {
    localStorage.setItem(
      'oversync_transactions_v2',
      JSON.stringify([
        {
          id: 'tx-123',
          txHash: ETH_HASH,
          ethTxHash: ETH_HASH,
          stellarTxHash: STELLAR_HASH,
          refundTxHash: REFUND_HASH,
          refundNetwork: 'ethereum',
          amount: '1',
          fromToken: 'ETH',
          toToken: 'XLM',
          fromNetwork: 'Ethereum',
          toNetwork: 'Stellar',
          estimatedAmount: '1',
          status: 'cancelled',
          direction: 'eth-to-xlm',
          timestamp: Date.now(),
        },
      ]),
    );

    const { container } = render(<TransactionHistory />);

    const lockLink = await waitFor(() => {
      const link = container.querySelector<HTMLAnchorElement>(
        `a[href="https://sepolia.etherscan.io/tx/${ETH_HASH}"]`,
      );
      expect(link).not.toBeNull();
      return link;
    });
    expect(lockLink).toHaveTextContent('Etherscan');
    expectProtectedLink(lockLink);

    const claimLink = container.querySelector<HTMLAnchorElement>(
      `a[href="https://stellar.expert/explorer/testnet/tx/${STELLAR_HASH}"]`,
    );
    expect(claimLink).toHaveTextContent('Stellar Expert');
    expectProtectedLink(claimLink);

    const refundLink = container.querySelector<HTMLAnchorElement>(
      `a[href="https://sepolia.etherscan.io/tx/${REFUND_HASH}"]`,
    );
    expect(refundLink).toHaveTextContent('Refunded · view onEthereum');
    expectProtectedLink(refundLink);

    const blankLinks = Array.from(container.querySelectorAll('a[target="_blank"]'));
    expect(blankLinks.length).toBeGreaterThan(0);
    blankLinks.forEach(expectProtectedLink);
  });
});
