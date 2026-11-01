'use strict';
// Starter: free extension + Pro tier. Replace the demo commands with the real features.
const vscode = require('vscode');
const licence = require('./src/licence');

const NAME = 'starter'; // command prefix; must match package.json

async function requirePro(ctx) {
  if (await licence.isPro(ctx)) return true;
  const pick = await vscode.window.showWarningMessage('This is a Pro feature.', 'Buy Pro', 'Enter key');
  if (pick === 'Buy Pro') vscode.commands.executeCommand(`${NAME}.buyPro`);
  if (pick === 'Enter key') vscode.commands.executeCommand(`${NAME}.enterKey`);
  return false;
}

function activate(ctx) {
  const reg = (id, fn) => ctx.subscriptions.push(vscode.commands.registerCommand(`${NAME}.${id}`, fn));

  reg('freeHello', () => vscode.window.showInformationMessage('Free feature works.'));
  reg('proHello', async () => {
    if (await requirePro(ctx)) vscode.window.showInformationMessage('Pro feature works.');
  });

  reg('buyPro', () => vscode.env.openExternal(vscode.Uri.parse(licence.buyUrl)));

  reg('enterKey', async () => {
    const key = ((await vscode.window.showInputBox({ prompt: 'Paste your Pro licence key', ignoreFocusOut: true })) || '').trim();
    if (!key) return;
    const r = await licence.activateKey(ctx, key);
    if (r.ok) vscode.window.showInformationMessage('Pro unlocked on this machine.');
    else if (r.reason === 'limit') vscode.window.showErrorMessage('This key is already active on the maximum number of machines.');
    else if (r.reason === 'invalid') vscode.window.showErrorMessage('That key is not valid or no longer active.');
    else vscode.window.showErrorMessage(`Licence check failed (HTTP ${r.status}). Try again later.`);
  });

  reg('status', async () => {
    vscode.window.showInformationMessage((await licence.isPro(ctx)) ? 'Licence: Pro (verified)' : 'Licence: Free');
  });

  reg('removeKey', async () => {
    await licence.removeKey(ctx);
    vscode.window.showInformationMessage('Licence removed from this machine.');
  });
}

function deactivate() {}
module.exports = { activate, deactivate };
