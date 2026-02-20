import type { SupportedExchange } from '../models';
import { backpackExchangeAdapter } from './backpack';
import type { ExchangeAdapter } from './types';

const adapters: Record<SupportedExchange, ExchangeAdapter> = {
  backpack: backpackExchangeAdapter
};

export function getExchangeAdapter(exchangeId: SupportedExchange): ExchangeAdapter {
  return adapters[exchangeId];
}

export function getExchangeOptions(): Array<{ id: SupportedExchange; label: string }> {
  return Object.values(adapters).map((adapter) => ({
    id: adapter.id,
    label: adapter.label
  }));
}
