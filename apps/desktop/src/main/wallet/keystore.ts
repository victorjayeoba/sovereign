import { app, safeStorage } from 'electron'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Encrypted mnemonic storage for the agent's non-custodial wallet.
 *
 * Backed by Electron's `safeStorage` API which encrypts via:
 *   - macOS  : Keychain (Security framework)
 *   - Windows: DPAPI (current-user scope)
 *   - Linux  : Secret Service / kwallet5
 *
 * If the platform's encryption backend is unavailable, this module REFUSES
 * to write a plaintext mnemonic. The agent's wallet remains uninitialised
 * — better to fail loudly than to leak keys.
 */

function vaultPath(): string {
  return join(app.getPath('userData'), 'wallet.vault')
}

export function isAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export async function hasMnemonic(): Promise<boolean> {
  return existsSync(vaultPath())
}

export async function loadMnemonic(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null
  if (!existsSync(vaultPath())) return null
  try {
    const encrypted = await readFile(vaultPath())
    return safeStorage.decryptString(encrypted)
  } catch (err) {
    console.error('[wallet.keystore] failed to decrypt vault:', err)
    return null
  }
}

export async function saveMnemonic(mnemonic: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'safeStorage encryption is not available on this platform — refusing to save plaintext mnemonic. Sovereign cannot create a wallet here.'
    )
  }
  const encrypted = safeStorage.encryptString(mnemonic)
  await writeFile(vaultPath(), encrypted, { mode: 0o600 })
}

export async function deleteMnemonic(): Promise<void> {
  if (!existsSync(vaultPath())) return
  try {
    await unlink(vaultPath())
  } catch (err) {
    console.warn('[wallet.keystore] failed to delete vault:', err)
  }
}
