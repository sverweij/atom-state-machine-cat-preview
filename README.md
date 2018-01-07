# Atom _State Machine Cat_ Preview package

Write beautiful state charts.

Shows the rendered finite state machine diagram of the smcat in your current editor window when you press `ctrl-shift-G`.

Enabled for `.smcat` files

![animated gif demoing live preview of a simple state chart](https://raw.githubusercontent.com/sverweij/atom-state-machine-cat-preview/master/assets/atom-state-machine-cat-preview.gif)

## Features
- **syntax highlighting**
- **realtime rendering** of your state machine diagram
- **SVG export** - to file or clipboard
- **PNG export** - to file
- Uses the pure javascript **[state-machine-cat](https://gitlab.com/sverweij/state-machine-cat)** package for parsing and rendering. That supports most UML state machine elements. Apart from states and transitions:
  - _initial_, _final_, _choice_, _join_ and _fork_ pseudo states
  - nested state machines
  - state activities
  - notes

## License information
This software is free software [licensed under GPL-3.0](LICENSE.md). This means (a.o.) you _can_ use
it as part of other free software, but _not_ as part of non free software.

## Build status
[![Build Status on Travis (linux and macOS)](https://travis-ci.org/sverweij/atom-state-machine-cat-preview.svg?branch=master)](https://travis-ci.org/sverweij/atom-state-machine-cat-preview)
[![Build status on Appveyor (windows)](https://ci.appveyor.com/api/projects/status/4cx2of2rx0s4nxxb?svg=true)](https://ci.appveyor.com/project/sverweij/atom-state-machine-cat-preview)
[![Dependency Status](https://david-dm.org/sverweij/atom-state-machine-cat-preview.svg)](https://david-dm.org/sverweij/atom-state-machine-cat-preview)
[![devDependency Status](https://david-dm.org/sverweij/atom-state-machine-cat-preview/dev-status.svg)](https://david-dm.org/sverweij/atom-state-machine-cat-preview#info=devDependencies)

![doc/pic/smcat-full-small.png](https://gitlab.com/sverweij/state-machine-cat/raw/master/doc/pics/smcat-full-small.png)
