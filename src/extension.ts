import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('[workspace-path-sessions] is now active!');

  let disposableWorkspaceChange = vscode.workspace.onDidChangeWorkspaceFolders(async e => {
    log('folders changed ');

    const allTabs = vscode.window.tabGroups.all.map(group => group.tabs).flat();

    // Handle removed folders: save associated tabs
    for (const folder of e.removed) {
      const folderUriStr = folder.uri.toString();
      const tabsToClose = allTabs.filter(tab => {
          const tabInput = tab.input;
          if (tabInput instanceof vscode.TabInputText) {
            return tabInput.uri.toString().startsWith(folderUriStr);
          }
          return false;
        });

      // Save URIs for later restoration
      const tabUris = tabsToClose.map(tab => (tab.input as vscode.TabInputText).uri.toString());
      context.workspaceState.update(folderUriStr, tabUris);

      // Close the tabs associated with the removed folder
      for (const tab of tabsToClose) {
        await closeDocument((tab.input as vscode.TabInputText).uri);
      }
    }

    // Handle added folders: restore tabs
    for (const folder of e.added) {
      const folderUriStr = folder.uri.toString();
      const savedTabUris: string[] = context.workspaceState.get(folderUriStr) ?? [];

      // Restore tabs for this folder
      for (const uriStr of savedTabUris) {
        const uri = vscode.Uri.parse(uriStr);
        await vscode.window.showTextDocument(uri, { preview: false, preserveFocus: false });
      }
      // set focus on the code-workspace document if it exists
      const workspaceTab = allTabs.find(tab => {
        // check if the file uri contains extension .code-workspace
        return tab.input instanceof vscode.TabInputText && tab.input.uri.toString().endsWith('.code-workspace');
      });
      if (workspaceTab) {
        await vscode.window.showTextDocument((workspaceTab.input as vscode.TabInputText).uri, { preview: false });
      }

      // Clear the saved state after restoring to avoid restoration in subsequent workspace changes
      context.workspaceState.update(folderUriStr, undefined);
    }
  });

  context.subscriptions.push(disposableWorkspaceChange);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function closeDocument(uri: vscode.Uri) {
    let document = await vscode.workspace.openTextDocument(uri); // Ensure the document is open
    let editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true }); // Focus the document without stealing focus
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); // Close the now-active editor
}

function log(...args: any[]) {
  console.log('[workspace-path-sessions]', ...args);
}
