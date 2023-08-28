/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category RemoveGuard
 * @category generated
 */
export const RemoveGuardStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number
}>([['instructionDiscriminator', beet.u8]], 'RemoveGuardInstructionArgs')
/**
 * Accounts required by the _RemoveGuard_ instruction
 *
 * @property [_writable_] profileInfo PDA of Krypton Program to be recovered
 * @property [**signer**] authorityInfo Pubkey of keypair of PDA to be recovered
 * @property [_writable_] guardInfo PDA of the guard account that will be initialized
 * @category Instructions
 * @category RemoveGuard
 * @category generated
 */
export type RemoveGuardInstructionAccounts = {
  profileInfo: web3.PublicKey
  authorityInfo: web3.PublicKey
  guardInfo: web3.PublicKey
  systemProgram?: web3.PublicKey
}

export const removeGuardInstructionDiscriminator = 11

/**
 * Creates a _RemoveGuard_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category RemoveGuard
 * @category generated
 */
export function createRemoveGuardInstruction(
  accounts: RemoveGuardInstructionAccounts,
  programId = new web3.PublicKey('2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL')
) {
  const [data] = RemoveGuardStruct.serialize({
    instructionDiscriminator: removeGuardInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.profileInfo,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.authorityInfo,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: accounts.guardInfo,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
  ]

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}