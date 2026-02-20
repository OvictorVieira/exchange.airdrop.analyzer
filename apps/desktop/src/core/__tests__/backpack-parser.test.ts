import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBackpackCsvText } from '../exchanges/backpack';
import { parseLocaleNumber } from '../exchanges/number';

describe('parseLocaleNumber', () => {
  it('parses US and BR number formats', () => {
    expect(parseLocaleNumber('1234.56')).toBe(1234.56);
    expect(parseLocaleNumber('1.234,56')).toBe(1234.56);
    expect(parseLocaleNumber('1,234.56')).toBe(1234.56);
    expect(parseLocaleNumber('0.566')).toBe(0.566);
    expect(parseLocaleNumber('0,566')).toBe(0.566);
    expect(parseLocaleNumber('-0.566')).toBe(-0.566);
    expect(parseLocaleNumber('invalid')).toBeNull();
  });
});

describe('parseBackpackCsvText', () => {
  const canonicalHeader =
    'position_id,market_symbol,net_quantity,net_exposure_quantity,net_exposure_notional,net_cost,mark_price,entry_price,cumulative_pnl_realized,total_unrealized_pnl,total_funding_quantity,total_interest,total_liquidated,total_trading_fees,last_event_type,max_net_quantity,max_net_quantity_direction,closing_price,account_leverage,opened_at,closed_at';

  it('accepts valid rows and tracks invalid rows', () => {
    const fixturePath = resolve(__dirname, 'fixtures', 'backpack_mixed_locale.csv');
    const csv = readFileSync(fixturePath, 'utf-8');

    const parsed = parseBackpackCsvText(csv, 'wallet_a_position_history.csv');

    expect(parsed.result.status).toBe('ok');
    expect(parsed.result.rowsTotal).toBe(3);
    expect(parsed.result.rowsValid).toBe(2);
    expect(parsed.result.rowsInvalid).toBe(1);
    expect(parsed.result.minOpenedAt).toBe('2024-01-01T00:00:00Z');
    expect(parsed.result.maxClosedAt).toBe('2024-01-04T00:00:00Z');
    expect(parsed.result.rows[0]?.sourceFile).toBe('wallet_a_position_history.csv');
  });

  it('returns schema error when column count is invalid', () => {
    const csv = 'market_symbol,total_trading_fees\nBTC_USDC_PERP,10';
    const parsed = parseBackpackCsvText(csv, 'bad.csv');

    expect(parsed.result.status).toBe('error');
    expect(parsed.result.errors.some((error) => error.includes('Quantidade de colunas invalida'))).toBe(
      true
    );
  });

  it('returns schema error when header sequence is invalid', () => {
    const wrongSequenceHeader = canonicalHeader.replace(
      'position_id,market_symbol',
      'market_symbol,position_id'
    );
    const csv = `${wrongSequenceHeader}\nBTC_USDC_PERP,p1,0.1,0.1,100,10,1,1,5,0,0,0,false,1,CLOSE,0.2,LONG,1.1,2,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z`;
    const parsed = parseBackpackCsvText(csv, 'bad_order.csv');

    expect(parsed.result.status).toBe('error');
    expect(
      parsed.result.errors.some((error) =>
        error.includes('Sequencia de colunas invalida para position_history da Backpack.')
      )
    ).toBe(true);
  });
});
