# Hyperclick PHP

A *very* simple [Hyperclick](https://github.com/facebooknuclideapm/hyperclick)
provider for PHP.  Inspired by [js-hyperclick](https://github.com/AsaAyers/js-hyperclick).
Hyperclick package is required.

### Usage
`<cmd-click>` on a supported word to jump it's declaration or location.

### Features
* **Variables**: jump to their last definition in current file.
* **Required/Included Files**: open file in new pane, or - if already open - jump to it's pane in editor.
* Will attempt to resolve **included files** in current directory, then parent directories, until project root is reached
* **Functions**: jump to their definition in the current file.

### Known Issues
* originally designed to handle a morass of procedural code (ie not object definitions)
* only works for variables & functions defined in the current file
* array references/definitions don't work
* pays no attention to scope or if a variable was defined as part of function prototype
* probably won't work with object instance variables

so ... to reiterate: *very* simple
