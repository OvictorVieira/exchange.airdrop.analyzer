import { describe, expect, it } from 'vitest';
import { parsePacificaCsvText } from '../exchanges/pacifica';

describe('parsePacificaCsvText', () => {
  const canonicalHeader =
    'Time,Symbol,Side,Type,Size,Price,Trade Value,Fee,Realized PnL';

  it('accepts valid rows and tracks invalid rows', () => {
    const csv = `${canonicalHeader}
"2026-01-25 00:20:54","ETH","Close Long","Fulfill Taker","0.0057 ETH","2,946.5","$16.8","$0.01","+$0.11"
"2026-01-23 11:39:59","ETH","Close Long","Fulfill Taker","0.0057 ETH","2,892.1","$16.48","$0.01","-$0.2"
"2026-01-22 11:36:59","ETH","Close Long","Fulfill Taker","0.0063 ETH","2,950.8","$18.59","invalid","-$0.01"`;

    const parsed = parsePacificaCsvText(csv, 'pacifica-trade-history.csv');

    expect(parsed.result.status).toBe('ok');
    expect(parsed.result.rowsTotal).toBe(3);
    expect(parsed.result.rowsValid).toBe(2);
    expect(parsed.result.rowsInvalid).toBe(1);
    expect(parsed.result.minOpenedAt).toBe('2026-01-23T11:39:59');
    expect(parsed.result.maxClosedAt).toBe('2026-01-25T00:20:54');
    expect(parsed.result.rows[0]?.marketSymbol).toBe('ETH');
    expect(parsed.result.rows[0]?.netExposureNotional).toBe(16.8);
    expect(parsed.result.rows[0]?.totalTradingFees).toBe(0.01);
    expect(parsed.result.rows[0]?.cumulativePnlRealized).toBe(0.11);
    expect(parsed.result.rows[1]?.cumulativePnlRealized).toBe(-0.2);
  });

  it('returns schema error when column count is invalid', () => {
    const csv = 'Time,Symbol,Fee\n"2026-01-01 10:00:00","BTC","$0.02"';
    const parsed = parsePacificaCsvText(csv, 'bad.csv');

    expect(parsed.result.status).toBe('error');
    expect(parsed.result.errors.some((error) => error.includes('Quantidade de colunas invalida'))).toBe(
      true
    );
  });

  it('returns schema error when header sequence is invalid', () => {
    const wrongSequenceHeader = canonicalHeader.replace('Time,Symbol', 'Symbol,Time');
    const csv = `${wrongSequenceHeader}
"ETH","2026-01-25 00:20:54","Close Long","Fulfill Taker","0.0057 ETH","2,946.5","$16.8","$0.01","+$0.11"`;

    const parsed = parsePacificaCsvText(csv, 'bad-order.csv');

    expect(parsed.result.status).toBe('error');
    expect(
      parsed.result.errors.some((error) =>
        error.includes('Sequencia de colunas invalida para trade_history da Pacifica.')
      )
    ).toBe(true);
  });
});
