'use babel';
/* @flow */

module.exports = {
  getProvider() {
    return {
      getSuggestionForWord(textEditor: TextEditor, text: string, range: Range): HyperclickSuggestion {
        return {
          range,
          callback() {
            var detail = `Text: ${text}\n` +
                `File: ${textEditor.getPath()}\n` +
                `Range: ${range}`;
            atom.notifications.addInfo('Hyperclick provider demo', {detail});
          },
        };
      },
    };
  },
};
