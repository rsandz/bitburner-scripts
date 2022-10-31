# Bitburner Hacking Scripts

[Bitburner](https://github.com/danielyxie/bitburner) is a programming based clicker game.
The goal is to hack servers to earn in currency that can be used to buy numerous upgrades.
This repository holds the scripts and libraries that I developed to make progress in the game. 

## Development Environment Set-Up

VSCode is used for development so code-completion will work best with it.

To develop in VScode:
- Download the Bitburner Extension in VSCode
- In `.vscode/settings.json`, add 

```json
{
    "bitburner.scriptRoot": "./src/",
    "bitburner.authToken": "<auth-key>"
}
```

- Enable the API server in game.