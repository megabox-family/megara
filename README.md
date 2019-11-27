# Megara
The Megabox discord bot

## Deploy command:
`rsync -rltgoDzvO --delete src/ [USER]@[HOST]:/[USER]/megara`

This will deploy only the contents of the src folder. Config should be manually copied when needed.

After deploying, install the npm packages with `npm i`

Start Megara with `npm start`
