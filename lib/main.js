'use babel';
/* @flow */
import url  from 'url'
import path from 'path'
import { Range, File } from 'atom'

export const isPHP = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return ( scopeName === 'source.php' ||
             scopeName === 'text.html.php' ||
             scopeName === 'meta.embedded.block.php' )
}


function isFunction( textEditor, range ) {

  var line = textEditor.buffer.lineForRow( range.start.row );

  // match function calls, not function definitions
  var matches = line.match(/([a-zA-Z0-9_]+)\(/g);

  // if no match, or the line looks like a function definition, bail out
  if ( matches == null || line.match(/function /) )
    return false;

  // multiple variables on same line give multiple matches, so find the
  // right one to jump to
  for (var i = 0; i < matches.length; i++) {

    var varStart = line.indexOf( matches[i] );

    if ( varStart                     <= range.start.column &&
         varStart + matches[i].length >= range.end.column ) {
        return {
          name: matches[i].substring( 0, matches[i].length - 1 ),
          underlineRange: new Range( [ range.start.row, varStart ],
                                     [ range.end.row,   varStart + matches[i].length - 1 ])
          };
        }

  }

  return false;

}

function scrollToFunctionDefn( textEditor, name, range ) {

  var line;
  var n = range.start.row;
  var m;
  var re = new RegExp( 'function \\s*' + name + '\\(' );

  while ( n-- > 0 ) {
    line = textEditor.buffer.lineForRow( n );

    if ( m = line.match( re ) )
      break;
  }

  if ( m == null || n == -1 )
    return;

  textEditor.setCursorBufferPosition([n, line.indexOf( name )]);
  textEditor.scrollToCursorPosition()

}


function scrollToVarDefn( textEditor, varname, range ) {

  var line;
  var n = range.start.row;
  var m;
  var re = new RegExp( "\\" + varname + "\s*[^=]?=" );

  // post-decrement to start looking at line above click
  while ( n-- > 0 ) {
    line = textEditor.buffer.lineForRow( n );

    if ( m = line.match( re ) )
      break;
  }

  if ( m == null || n == -1 )
    return;

  textEditor.setCursorBufferPosition([n, line.indexOf( varname )]);
  textEditor.scrollToCursorPosition()

}


function isVariable( textEditor, range ) {

  var line = textEditor.buffer.lineForRow( range.start.row );

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  var matches = line.match(/(\$[a-zA-Z0-9_]+)/g);

  if ( matches == null )
    return false;

  // multiple variables on same line give multiple matches, so find the
  // right one to jump to
  for (var i = 0; i < matches.length; i++) {

    var varStart = line.indexOf( matches[i] );

    if ( varStart                     <= range.start.column &&
         varStart + matches[i].length >= range.end.column ) {
        return {
          name: matches[i],
          underlineRange: new Range( [ range.start.row, varStart ],
                                     [ range.end.row,   varStart + matches[i].length ])
          };
        }

  }

  return false;

}

function isPath( textEditor, range ) {

  var line = textEditor.buffer.lineForRow( range.start.row );

  // can test via console with:
  // atom.workspace.getActiveTextEditor().buffer.lineForRow(11).match(/(require|include)(_once)?.+(['"])(.+)\3/)
  var matches = line.match(/(require|include)(_once)?.+((['"])(.+)\4)/);

  if ( matches == null )
    return false;

  // this does not include the quotes (use [3] to get it w/ quotes)
  var filename = matches[5];
  var pathStart = line.indexOf( filename );

  if ( pathStart <= range.start.column && pathStart + filename.length >= range.end.column )
    return {
      name: filename.replace(/['"]/g, ""), // remove the quotes
      underlineRange: new Range( [ range.start.row, pathStart ],
                                 [ range.end.row, pathStart + filename.length ] )
    };
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

  let dirname = textEditor.getPath();
  // move up the dir tree
  while ( dirname = path.dirname( dirname ) ) {

    file = new File( path.resolve( dirname, filename ));

    if ( file.existsSync() ) {
      atom.workspace.open( file.getPath() );
      break;
    }

    // if stop looking if we've reached the project root
    if ( atom.project.getPaths().indexOf( dirname ) != -1 )
      break;
  }

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
  // wordRegExp: /(['"]).+?\1/,
  getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
    if ( isPHP( textEditor )) {

      p = isPath( textEditor, range );
      if ( p ) {

        return {
          // The range(s) to underline as a visual cue for clicking.
          range: p.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            openFile( textEditor, p.name );
          }
        }
      }

      t = isVariable( textEditor, range );
      if ( t ) {
        return {
          // The range(s) to underline as a visual cue for clicking.
          range: t.underlineRange,
          // The function to call when the underlined text is clicked.
          callback() {
            scrollToVarDefn( textEditor, t.name, range );
          }
        }
      }

      f = isFunction( textEditor, range );
      if ( f ) {
        return {
          range: f.underlineRange,
          callback() {
            scrollToFunctionDefn( textEditor, f.name, range );
          }
        }
      }
    }
  },
};


// THIS IS NOT USED!
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
