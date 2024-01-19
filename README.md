
# ModelSEED UI <sup>(beta)</sup> [![Build Status](https://travis-ci.org/ModelSEED/ModelSEED-UI.svg?branch=master)](https://travis-ci.org/ModelSEED/ModelSEED-UI)

## Requirements
- node (https://nodejs.org/)
(it is recommended that you use nvm to manage versions of node and the package manager npm)

## Local Installation

```
git clone --recursive https://github.com/modelseed/modelseed-ui.git modelseed-ui
cd modelseed-ui
npm install
```

Now point your favorite webserver at `modelseed-ui` and you are ready to go!

From `modelseed-ui`:

```
http-server -o
```


### Build

This step creates an `index.html` with compiled/minimized CSS/JS files (located in `/app/build/`).

From `modelseed-ui`:

```
npm install
grunt build
```

Notes:
- `npm install` installs grunt dependencies.
- `grunt build` does the build work


## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request


## License

Released under [the MIT license](https://github.com/modelseed/modelseed-ui/blob/master/LICENSE).
