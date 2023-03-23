import { initialize } from "solmate-wallet-standard";
import { SolanaProvider } from './provider';

const solmate = new SolanaProvider();

initialize(solmate);

try {
  Object.defineProperty(window, 'solmate', { value: solmate });
} catch (error) {
  console.error(error);
}