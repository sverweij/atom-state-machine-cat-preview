# Atom _State Machine Cat_ Preview package

Write beautiful state charts.

Shows the rendered finite state machine diagram of the smcat or scxml in your current editor window when you press `ctrl-shift-G`.

Enabled for `.smcat`  and `.scxml` files

![animated gif demoing live preview of a simple state chart](https://raw.githubusercontent.com/sverweij/atom-state-machine-cat-preview/master/assets/atom-state-machine-cat-preview.gif)

## Features
- **syntax highlighting**
- **realtime rendering** of your state machine diagram
- **SVG export** - to file or clipboard
- **PNG export** - to file
- Uses the pure javascript **[state-machine-cat](https://github.com/sverweij/state-machine-cat)** package for parsing and rendering. That supports most UML state machine elements. Apart from states and transitions:
  - _initial_, _final_, _choice_, _join_, _fork_, _junction_, _history_, _deep history_ and _destroy_ pseudo states
  - nested state machines
  - parallel states
  - state activities
  - transition _events_, _conditions_ and _actions_
  - notes
- **realtime rendering of SCXML documents**

See the short, illustrated
[tutorial](https://github.com/sverweij/state-machine-cat/blob/develop/README.md#short-tutorial)
for details.

## License information
This software is free software [licensed under the MIT license](LICENSE).

## Build status
[![GH Actions](https://github.com/sverweij/atom-state-machine-cat-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/sverweij/atom-state-machine-cat-preview/actions/workflows/ci.yml)
[![Dependency Status](https://david-dm.org/sverweij/atom-state-machine-cat-preview.svg)](https://david-dm.org/sverweij/atom-state-machine-cat-preview)
[![devDependency Status](https://david-dm.org/sverweij/atom-state-machine-cat-preview/dev-status.svg)](https://david-dm.org/sverweij/atom-state-machine-cat-preview#info=devDependencies)

![doc/pic/smcat-full-small.png](https://github.com/sverweij/state-machine-cat/raw/master/docs/pics/smcat-full-small.png)
