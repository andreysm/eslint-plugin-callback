# eslint-plugin-callback

Checks that all callbacks are called

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm install -g eslint
```

Next, install `eslint-plugin-callback`:

Clone this repo to `eslint-plugin-callback`,
```
$ cd ./eslint-plugin-callback
$ npm link eslint-plugin-callback --production
```

## Usage

Add `callback` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "callback"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "callback/callback": 1
    }
}
```






