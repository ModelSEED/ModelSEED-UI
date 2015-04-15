
# ModelSEED UI (under dev)


## Local Installation

```
git clone https://github.com/modelseed/modelseed-ui.git modelseed-ui
git submodule update --init
bower install
```

Notes:
- `git submodule update --init` installs some submodules in `lib/`
- `bower install` installs some third-party (front-end) dependencies


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

## Author(s)

Neal Conrad <nconrad@anl.gov>


## License

Released under [the MIT license](https://github.com/modelseed/modelseed-ui/blob/master/LICENSE).
