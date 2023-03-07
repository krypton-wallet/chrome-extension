import { registerWallet } from './register.js';
import { SolmateWallet } from './wallet.js';
import type { Solmate } from './window.js';

export function initialize(solmate: Solmate): void {
    registerWallet(new SolmateWallet(solmate));
}
