"use babel";
/* @flow */
import url from "url";
import path from "path";
import { Range, File } from "atom";

export const isPHP = textEditor => {
  const { scopeName } = textEditor.getGrammar();

  return (
    scopeName === "source.php" ||
    scopeName === "text.html.php" ||
    scopeName === "meta.embedded.block.php"
  );
};

function isFunction(textEditor, range) {
  var line = textEditor.getBuffer().lineForRow(range.start.row);

  // match function calls, not function definitions
  // needs to handle `foo()` and `foo ()`
  var matches = line.match(/([a-zA-Z0-9_]+\s*)\(/g);

  // if no match, or the line looks like a function definition, bail out
  if (matches === null || line.match(/function /)) {
    return false;
  }

  // needs to handle multiple functions on the same line, like
  // setData('val1'); setData(val2');
  var indexStart = 0;
  for (var i = 0; i < matches.length; i++) {
    var varStart = line.indexOf(matches[i], indexStart);

    if (
      varStart <= range.start.column &&
      varStart + matches[i].length >= range.end.column
    ) {
      return {
        name: matches[i].substring(0, matches[i].length - 1),
        underlineRange: new Range(
          [range.start.row, varStart],
          [range.end.row, varStart + matches[i].length - 1]
        )
      };
    }

    indexStart = varStart + matches[i].length;
  }

  return false;
}

/**
 * Find the definition of the function `name`, place the cursor at the beginning
 * of the definition and scroll the cursor into view.
 */
function scrollToFunctionDefn(textEditor, name) {
  var line;
  var re = new RegExp("function \\s*" + name + "\\(");

  // search the whole file top-to-bottom for the function definition
  for (
    var n = 0;
    (line = textEditor.getBuffer().lineForRow(n)) !== undefined;
    n++
  ) {
    // don't bother inspecting blank lines
    if (!line.length) {
      continue;
    }

    if (line.match(re)) {
      break;
    }
  }

  // we reached the end w/o finding a match
  if (line === undefined) {
    return;
  }

  textEditor.setCursorBufferPosition([n, line.indexOf(name)]);
  textEditor.scrollToCursorPosition();
}

/**
 * Search from the given range for the last time that variable `varname` was
 * defined, place the cursor at the beginning of the definition and scroll the
 * cursor into view.
 */
function scrollToVarDefn(textEditor, varname, range) {
  var line;

  // this pattern should handle things like like:
  // $foo = 'bar;'
  // $foo='bar;'
  // $this->foo = 'bar';
  // $this -> foo = 'bar';
  var re = new RegExp("\\" + varname.replace(/\s+/g, "\\s*") + "\\s*[^=]?=");

  // search from line above the current line to top of file for the
  // "most recent" place the var was set
  for (
    var n = range.start.row - 1;
    (line = textEditor.getBuffer().lineForRow(n)) !== undefined;
    n--
  ) {
    // don't bother inspecting blank lines
    if (!line.length) {
      continue;
    }

    if (line.match(re)) {
      break;
    }
  }

  // we reached the top w/o finding a match
  if (line === undefined) {
    return;
  }

  textEditor.setCursorBufferPosition([n, line.search(re)]);
  textEditor.scrollToCursorPosition();
}

function isVariable(textEditor, range) {
  var line = textEditor.getBuffer().lineForRow(range.start.row);

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  // this pattern should handle things like: $foo, $this->foo, $this -> foo
  var matches = line.match(
    /(\$([a-zA-Z0-9_\s]+)->([\sa-zA-Z0-9_]+\b(?!\()))|(\$[a-zA-Z0-9_]+)/g
  );
  if (matches === null) {
    return false;
  }

  // needs to handle multiple variables on same line, like
  // $this->data['item1'], $this->data['item2'], $this->data['item3']
  var indexStart = 0;
  for (var i = 0; i < matches.length; i++) {
    var varStart = line.indexOf(matches[i], indexStart);

    if (
      varStart <= range.start.column &&
      varStart + matches[i].length >= range.end.column
    ) {
      return {
        name: matches[i],
        underlineRange: new Range(
          [range.start.row, varStart],
          [range.end.row, varStart + matches[i].length]
        )
      };
    }

    indexStart = varStart + matches[i].length;
  }

  return false;
}

function isPath(textEditor, range) {
  var line = textEditor.getBuffer().lineForRow(range.start.row);

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  var matches = line.match(/(require|include)(_once)?.+((['"])(.+)\4)/);

  if (matches == null) {
    return false;
  }
  // this does not include the quotes (use [3] to get it w/ quotes)
  var filename = matches[5];
  var pathStart = line.indexOf(filename);

  if (
    pathStart <= range.start.column &&
    pathStart + filename.length >= range.end.column
  )
    return {
      name: filename.replace(/['"]/g, ""), // remove the quotes
      underlineRange: new Range(
        [range.start.row, pathStart],
        [range.end.row, pathStart + filename.length]
      )
    };
  else {
    return false;
  }
}

function openFile(textEditor, filename) {
  // ctrl+click creates multiple cursors. This will remove all but the
  // last one to simulate cursor movement instead of creation.
  const lastCursor = textEditor.getLastCursor();
  textEditor.setCursorBufferPosition(lastCursor.getBufferPosition());

  let { protocol } = url.parse(filename);
  if (protocol === "http:" || protocol === "https:") {
    if (atom.packages.isPackageLoaded("web-browser")) {
      atom.workspace.open(filename);
    } else {
      shell.openExternal(filename);
    }
    return;
  }

  let dirname = textEditor.getPath();
  // move up the dir tree
  while ((dirname = path.dirname(dirname))) {
    file = new File(path.resolve(dirname, filename));

    if (file.existsSync()) {
      atom.workspace.open(file.getPath());
      break;
    }

    // if stop looking if we've reached the project root
    if (atom.project.getPaths().indexOf(dirname) != -1) {
      break;
    }
  }
}

// see https://github.com/facebooknuclideapm/hyperclick for
var singleSuggestionProvider = {
  providerName: "hyperclick-php",
  // wordRegExp: /(['"]).+?\1/,
  getSuggestionForWord(
    textEditor: TextEditor,
    text: string,
    range: Range
  ): HyperclickSuggestion {
    if (isPHP(textEditor)) {
      p = isPath(textEditor, range);
      if (p) {
        return {
          // The range(s) to underline as a visual cue for clicking.
          range: p.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            openFile(textEditor, p.name);
          }
        };
      }

      f = isFunction(textEditor, range);
      if (f) {
        return {
          // The range(s) to underline as a visual cue for clicking.
          range: f.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            scrollToFunctionDefn(textEditor, f.name);
          }
        };
      }

      t = isVariable(textEditor, range);
      if (t) {
        return {
          // The range(s) to underline as a visual cue for clicking.
          range: t.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            scrollToVarDefn(textEditor, t.name, range);
          }
        };
      }
    }
  }
};

module.exports = {
  getProvider() {
    return singleSuggestionProvider;
  }
};
