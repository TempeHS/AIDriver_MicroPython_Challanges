# VSCode GitHub Config Instructions

1. Log in to GitHub in VSCode

<img src="https://code.visualstudio.com/assets/docs/sourcecontrol/intro/vscode-accounts-menu.png" width="300" />

  - Choose `Backup and sync settings`
  - Click the `Sign in` button that appears in the top menu
  - Choose `GitHub` from the menu options
  - Authenticate in the browser when directed

2. Open a PowerShell Terminal

<img src="https://learn.microsoft.com/en-us/powershell/docs-conceptual/learn/ps101/media/figure1-1.jpg" width="300"/>

3. Apply the following commands, replacing `your@school.email` with your GitHub email address and replacing `username` with your GitHub username.

```bash
git config --global user.email "your@school.email"
git config --global user.name "username"
```

4. Once you have followed these steps, you can commit, push, and pull from VSCode using the 'Source Control' menu. On your first commit, you may need to authenticate through the browser again.

<img src="https://code.visualstudio.com/assets/docs/sourcecontrol/intro/source-control-view.png" width="300" />
