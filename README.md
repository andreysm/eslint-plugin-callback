# eslint-plugin-callback

Checks that all callbacks are called

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ sudo npm install -g eslint
```

Next, install `eslint-plugin-callback`:

```
$ sudo npm install -g eslint-plugin-callback
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






