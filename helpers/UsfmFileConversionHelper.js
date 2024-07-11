/* eslint-disable no-async-promise-executor, no-throw-literal */
import usfmjs from 'usfm-js';
import cloneDeep from "lodash.clonedeep";

/**
 * dive down into milestone to extract words and text
 * @param {Object} verseObject - milestone to parse
 * @return {string} text content of milestone
 */
const parseMilestone = verseObject => {
  let text = verseObject.text || '';
  let wordSpacing = '';
  const length = verseObject.children ? verseObject.children.length : 0;

  for (let i = 0; i < length; i++) {
    let child = verseObject.children[i];

    switch (child.type) {
    case 'word':
      text += wordSpacing + child.text;
      wordSpacing = ' ';
      break;

    case 'milestone':
      text += wordSpacing + parseMilestone(child);
      wordSpacing = ' ';
      break;

    default:
      if (child.text) {
        text += child.text;
        const lastChar = text.substr(-1);

        if ((lastChar !== ',') && (lastChar !== '.') && (lastChar !== '?') && (lastChar !== ';')) { // legacy support, make sure padding before word
          wordSpacing = '';
        }
      }
      break;
    }
  }
  return text;
};

/**
 * get text from word and milestone markers
 * @param {Object} verseObject - to parse
 * @param {String} wordSpacing - spacing to use before next word
 * @return {*} new verseObject and word spacing
 */
const replaceWordsAndMilestones = (verseObject, wordSpacing) => {
  let text = '';

  if (verseObject.type === 'word') {
    text = wordSpacing + verseObject.text;
  } else if (verseObject.type === 'milestone') {
    text = wordSpacing + parseMilestone(verseObject);
  }

  if (text) { // replace with text object
    verseObject = {
      type: 'text',
      text,
    };
    wordSpacing = ' ';
  } else {
    wordSpacing = ' ';

    if (verseObject.nextChar) {
      wordSpacing = ''; // no need for spacing before next word if this item has it
    } else if (verseObject.text) {
      const lastChar = verseObject.text.substr(-1);

      if (![',', '.', '?', ';'].includes(lastChar)) { // legacy support, make sure padding before next word if punctuation
        wordSpacing = '';
      }
    }

    if (verseObject.children) { // handle nested
      const verseObject_ = cloneDeep(verseObject);
      let wordSpacing_ = '';
      const length = verseObject.children.length;

      for (let i = 0; i < length; i++) {
        const flattened =
          replaceWordsAndMilestones(verseObject.children[i], wordSpacing_);
        wordSpacing_ = flattened.wordSpacing;
        verseObject_.children[i] = flattened.verseObject;
      }
      verseObject = verseObject_;
    }
  }
  return { verseObject, wordSpacing };
};

/**
 * converts verse from verse objects to USFM string
 * @param verseData
 * @return {string}
 */
function convertVerseDataToUSFM(verseData) {
  const outputData = {
    'chapters': {},
    'headers': [],
    'verses': { '1': verseData },
  };
  const USFM = usfmjs.toUSFM(outputData, { chunk: true, forcedNewLines: true });
  const split = USFM.split('\\v 1');

  if (split.length > 1) {
    let content = split[1];

    if (content.substr(0, 1) === ' ') { // remove space separator
      content = content.substr(1);
    }
    return content;
  }
  return ''; // error on JSON to USFM
}

/**
 * @description remove milestones and word markers
 * @param {Object|Array} verseData
 * @return {Object}
 */
function removeMilestonesAndWordMarkers(verseData) {
  const verseObjects = verseData?.verseObjects || verseData;
  if (verseObjects) {
    let wordSpacing = '';
    const flattenedData = [];
    const length = verseObjects.length;

    for (let i = 0; i < length; i++) {
      const verseObject = verseObjects[i];
      const flattened = replaceWordsAndMilestones(verseObject, wordSpacing);
      wordSpacing = flattened.wordSpacing;
      flattenedData.push(flattened.verseObject);
    }
    verseData = { // use flattened data
      verseObjects: flattenedData,
    };
  }
  return verseData;
}

/**
 * @description convert verse from verse objects to USFM string, removing milestones and word markers
 * @param {Object|Array} verseData
 * @return {String}
 */
const getUsfmForVerseContent = (verseData) => {
  verseData = removeMilestonesAndWordMarkers(verseData);
  return convertVerseDataToUSFM(verseData);
};

const flattenChapterData = (chapterData) => {
  let usfmStr = '';

  if ("front" in chapterData) {
    usfmStr += getUsfmForVerseContent(chapterData["front"]);
  }
  Object.keys(chapterData).forEach((verseNum) => {
    if (verseNum === "front") {
      return;
    }
    const verseData = chapterData[verseNum];
    usfmStr += `\\v ${verseNum} ` + getUsfmForVerseContent(verseData);
  });

  return usfmStr;
}

export const removeAlignments = (usfmContent) => {
  const usfmJSON = usfmjs.toJSON(usfmContent);
  let usfmStr = '';

  usfmJSON.headers.forEach(header => {
    if (header.type == "text") {
      usfmStr += `${header.text}\n`;
    } else if (header.tag && header.content) {
      if (header.content !== "\\*") {
        header.content = ` ${header.content}`;
      }
      usfmStr += `\\${header.tag}${header.content}\n`;
    }
  })

  if ("front" in usfmJSON.chapters) {
    usfmStr += flattenChapterData(usfmJSON.chapters["front"]);
  }
  Object.keys(usfmJSON.chapters).forEach(chapterNum => {
    if (chapterNum === "front") {
      return;
    }
    usfmStr += `\n\\c ${chapterNum}\n` + flattenChapterData(usfmJSON.chapters[chapterNum]);
  });

  return usfmStr;
}