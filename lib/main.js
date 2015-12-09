'use babel';
/* @flow */
import url  from 'url'
import path from 'path'

export const isPHP = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return ( scopeName === 'source.php' ||
             scopeName === 'text.html.php' ||
             scopeName === 'meta.embedded.block.php' )
}


function isPath( textEditor, range ) {

  var line = textEditor.buffer.lineForRow( range.start.row );

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  var matches = line.match(/(require|include)(_once)?.+((['"])(.+)\4)/);

  if ( matches == null )
    return false;

  // this includes the quotes
  var filename = matches[3];
  var pathStart = line.indexOf( filename );

  if ( pathStart <= range.start.column && pathStart + filename.length >= range.end.column )
    return filename.replace(/['"]/g, ""); // remove the quotes
  else
    return false;

}

function openFile( textEditor, filename ) {

  // ctrl+click creates multiple cursors. This will remove all but the
  // last one to simulate cursor movement instead of creation.
  const lastCursor = textEditor.getLastCursor()
  textEditor.setCursorBufferPosition(lastCursor.getBufferPosition())


  let { protocol } = url.parse(filename);
  if (protocol === 'http:' || protocol === 'https:') {
      if (atom.packages.isPackageLoaded('web-browser')) {
          atom.workspace.open(filename);
      } else {
          shell.openExternal(filename);
      }
      return;
  }

  let basedir = path.dirname(textEditor.getPath());
  filename = path.resolve(basedir, filename);
  atom.workspace.open(filename);
  // atom.workspace.open(filename).then((editor) => {
  //     if (typeof provider.scanForDestination !== 'function') {
  //         return;
  //     }
  //     let source = editor.getText();
  //     let dest = provider.scanForDestination(source, marker);
  //     console.log('dest', dest);
  //     if (dest) {
  //         editor.setCursorBufferPosition(dest);
  //         editor.scrollToCursorPosition();
  //     }
  // });

}

// see https://github.com/facebooknuclideapm/hyperclick for
var singleSuggestionProvider = {
  providerName: "hyperclick-php",
  wordRegExp: /(['"]).+\1/,
  getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
    if ( isPHP( textEditor )) {
      return {
        range,
        callback() {
          var p = isPath( textEditor, range );

          if ( p ) {
            openFile( textEditor, p );
            // var detail = `Text: ${text}\n` +
            //     `Match: ${p}\n` +
            //     `File: ${textEditor.getPath()}\n` +
            //     `Range: ${range}`;
            // atom.notifications.addInfo('Hyperclick provider demo', {detail});
          }
        },
      };
    }
  },
};

var multiSuggestionProvider = {
  providerName: "hyperclick-php",
  getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
    if (text.startsWith('multi')) {
      var detail = `Text: ${text}\n` +
          `File: ${textEditor.getPath()}\n` +
          `Range: ${range}`;
      return {
        range,
        callback: [
          {
            title: 'success',
            callback() {
              atom.notifications.addSuccess('Hyperclick multi provider demo', {detail});
            },
          },
          {
            title: 'info',
            callback() {
              atom.notifications.addInfo('Hyperclick multi provider demo', {detail});
            },
          },
          {
            title: 'warning',
            callback() {
              atom.notifications.addWarning('Hyperclick multi provider demo', {detail});
            },
          },
          {
            title: 'error',
            callback() {
              atom.notifications.addError('Hyperclick multi provider demo', {detail});
            },
          },
          {
            title: 'fatal error',
            callback() {
              atom.notifications.addFatalError('Hyperclick multi provider demo', {detail});
            },
          },
        ],
      };
    }
  },
  priority: 1,
};

module.exports = {
  getProvider() {
    return singleSuggestionProvider;
    // return [ singleSuggestionProvider, multiSuggestionProvider ];
  },
};
