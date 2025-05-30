import React from 'react';
import { 
  EditorBlock, 
  Modifier, 
  EditorState, 
  SelectionState,
  convertFromRaw,
  convertToRaw
 } from 'draft-js';
 
// needed for the async/await syntax
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from "regenerator-runtime";
import SpeakerLabel from './SpeakerLabel';
// import { shortTimecode, secondsToTimecode } from '../../Util/timecode-converter/';

import {
  shortTimecode,
  secondsToTimecode
} from '../../util/timecode-converter';

import style from './WrapperBlock.module.css';

const updateSpeakerName = (oldName, newName, state) => {
  const contentToUpdate = convertToRaw(state);

  contentToUpdate.blocks.forEach(block => {
    if (block.data.speaker === oldName) {
      block.data.speaker = newName;
    }
  })

  return convertFromRaw(contentToUpdate);
}


class WrapperBlock extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      speaker: '',
      start: 0,
      timecodeOffset: this.props.blockProps.timecodeOffset
    };
  }

  componentDidMount() {
    const { block } = this.props;
    const speaker = block.getData().get('speaker');
  
    const start = block.getData().get('start');

    this.setState({
      speaker: speaker,
      start: start
    });
  }
  // reducing unnecessary re-renders
  shouldComponentUpdate = (nextProps, nextState) => {
    if (nextProps.block.getText() !== this.props.block.getText()) {
      return true;
    }

    if (nextProps.blockProps.showSpeakers !== this.props.blockProps.showSpeakers) {
      return true;
    }

    if (nextProps.blockProps.showTimecodes !== this.props.blockProps.showTimecodes) {
      return true;
    }

    if (nextProps.blockProps.timecodeOffset !== this.props.blockProps.timecodeOffset) {
      return true;
    }

    if (nextState.speaker !== this.state.speaker) {
      return true;
    }

    if (nextProps.blockProps.isEditable !== this.props.blockProps.isEditable) {
      return true;
    }

    const currentBlockSpeaker = this.props.block.getData().get('speaker');
    const nextBlockSpeaker = nextProps.block.getData().get('speaker');


    if (nextBlockSpeaker !== currentBlockSpeaker) {
      console.log('shouldComponentUpdate wrapper speaker changed', {
        current: currentBlockSpeaker,
        next: nextBlockSpeaker,
        stateVal: this.state.speaker
      });
      return true;
    }

    return false;
  };

  componentDidUpdate  = (prevProps, prevState) =>{

    const currentBlockSpeaker = this.props.block.getData().get('speaker');
    const prevBlockSpeaker = prevProps.block.getData().get('speaker');

    if (prevBlockSpeaker !== currentBlockSpeaker && currentBlockSpeaker !== this.state.speaker) {
      console.log('componentDidUpdate: Updating speaker state', {
        prevBlockSpeaker,
        currentBlockSpeaker,
        currentStateVal: this.state.speaker
      });
      
      this.setState({
        speaker: currentBlockSpeaker
      });
    }
  }

  handleOnClickEdit = async () => {
    const oldSpeakerName = this.state.speaker;
    const { label: newSpeakerName, renameAllInstances } = await this.props.blockProps.changeSpeakerLabel();
    const isUpdateAllSpeakerInstances = renameAllInstances?.rename === true;
      if (newSpeakerName && newSpeakerName.trim() !== '') {
        this.setState({ speaker: newSpeakerName });

      if (this.props.blockProps.handleAnalyticsEvents) {
        this.props.blockProps.handleAnalyticsEvents({
          category: 'WrapperBlock',
          action: 'handleOnClickEdit',
          name: 'newSpeakerName',
          value: newSpeakerName
        });
      }


      if(isUpdateAllSpeakerInstances){
        const ContentState = this.props.blockProps.editorState.getCurrentContent();
        const contentToUpdateWithSpekaers = updateSpeakerName(oldSpeakerName, newSpeakerName, ContentState);
        this.props.blockProps.setEditorNewContentStateSpeakersUpdate(contentToUpdateWithSpekaers);
      }
      else{
       // From docs: https://draftjs.org/docs/api-reference-selection-state#keys-and-offsets
        // selection points are tracked as key/offset pairs,
        // where the key value is the key of the ContentBlock where the point is positioned
        // and the offset value is the character offset within the block.

        // Get key of the currentBlock
        const keyForCurrentCurrentBlock = this.props.block.getKey();
        // create empty selection for current block
        // https://draftjs.org/docs/api-reference-selection-state#createempty
        const currentBlockSelection = SelectionState.createEmpty(
          keyForCurrentCurrentBlock
        );
        const editorStateWithSelectedCurrentBlock = EditorState.acceptSelection(
          this.props.blockProps.editorState,
          currentBlockSelection
        );

        const currentBlockSelectionState = editorStateWithSelectedCurrentBlock.getSelection();
        const newBlockDataWithSpeakerName = { speaker: newSpeakerName };

        // https://draftjs.org/docs/api-reference-modifier#mergeblockdata
        const newContentState = Modifier.mergeBlockData(
          this.props.contentState,
          currentBlockSelectionState,
          newBlockDataWithSpeakerName
        );

        this.props.blockProps.setEditorNewContentStateSpeakersUpdate(newContentState);
      }
    }
  };

  handleTimecodeClick = () => {
    this.props.blockProps.onWordClick(this.state.start);
    if (this.props.blockProps.handleAnalyticsEvents) {
      this.props.blockProps.handleAnalyticsEvents({
        category: 'WrapperBlock',
        action: 'handleTimecodeClick',
        name: 'onWordClick',
        value: secondsToTimecode(this.state.start)
      });
    }
  };

  render() {
    let startTimecode = this.state.start;
    if (this.props.blockProps.timecodeOffset) {
      startTimecode += this.props.blockProps.timecodeOffset;
    }

    const speakerElement = (
      <SpeakerLabel
        name={ this.state.speaker }
        handleOnClickEdit={ this.handleOnClickEdit }
        isEditable={this.props.blockProps.isEditable}
      />
    );

    const timecodeElement = (
      <span className={ style.time } onClick={ this.handleTimecodeClick }>
        {shortTimecode(startTimecode)}
      </span>
    );

    return (
      <div className={ style.WrapperBlock }>
        <div
          className={ [ style.markers, style.unselectable ].join(' ') }
          contentEditable={ false }
        >
          {this.props.blockProps.showSpeakers ? speakerElement : ''}

          {this.props.blockProps.showTimecodes ? timecodeElement : ''}
        </div>
        <div className={ style.text }>
          <EditorBlock { ...this.props } />
        </div>
      </div>
    );
  }
}

export default WrapperBlock;
