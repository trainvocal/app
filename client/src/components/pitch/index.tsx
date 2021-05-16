import React, { Component, useCallback, useEffect, useRef } from 'react';
import qs from 'qs';

import { PitchDisplay } from 'pitch-display';

import { BACKGROUND } from '../../constants/colors';
import { useStoreState } from '../../model';

export interface PitchProps {
  freq: number | null;
  clarity: number | null;
}

function FastForwardButton({ onPress, onRelease, style }) {
  return (
    <div style={style} onMouseDown={onPress} onMouseUp={onRelease}>
      FAST FORWARD
    </div>
  );
}

function PauseButton({ onPress, onRelease, style }) {
  return (
    <div style={style} onMouseDown={onPress} onMouseUp={onRelease}>
      PAUSE
    </div>
  );
}

const useAnimationFrame = (callback) => {
  const requestRef = useRef();

  useEffect(() => {
    const animate = (time) => {
      callback(time);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []); // run this effect only once
};

function PitchComponent({
  freq,
  clarity,
}: PitchProps) {
  const pitchDisplay = useRef();

  const updatePitch = useCallback(() => {
    if (!pitchDisplay.current) {
      return;
    }

    if (freq && freq > 0) {
      const time = new Date().getTime();
      pitchDisplay.current.pushFrequency({
        frequency: freq,
        clarity: clarity || 0,
        time,
      });
    }
    pitchDisplay.current.render(false);
  }, [clarity, freq]);

  if (freq && freq > 0) {
    requestAnimationFrame((time) => updatePitch(time));
  }

  // Keep rendering and scrolling pitchDisplay at regular time intervals
  // even though the note has not changed
  useAnimationFrame(updatePitch);

  useEffect(() => {
    const onResize = () => {
      if (pitchDisplay.current) {
        pitchDisplay.current.resize();
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const notes = useStoreState((state) => state.melody.notes);
  useEffect(() => {
    if (pitchDisplay.current && notes) {
      pitchDisplay.current.setMelodyNotes(notes);
    }
  }, [notes]);

  const fastForwardStyle = {
    position: 'absolute',
    bottom: 40,
    right: 40,
  };
  const pauseStyle = {
    position: 'absolute',
    bottom: 40,
    left: 80,
  };

  const onDisplayRef = useCallback((element) => {
    if (element && !pitchDisplay.current) {
      // pitchDisplayRef.current = new PitchDisplay(displayElementRef.current!, 6000);
      pitchDisplay.current = new PitchDisplay(element, 6000);
      pitchDisplay.current.setBackgroundColor(BACKGROUND);
      if (notes) {
        pitchDisplay.current.setMelodyNotes(notes);
      }
      pitchDisplay.current.playSong();
    }
  }, [notes]);

  return (
    <React.Fragment>
      <div
        className="full"
        style={{ position: 'relative' }}
        ref={onDisplayRef}
      />
      <PauseButton
        onPress={() => pitchDisplay.current.pauseSong()}
        onRelease={() => pitchDisplay.current.playSong()}
        style={pauseStyle}
      />
      <FastForwardButton
        onPress={() => pitchDisplay.current.fastForwardSong()}
        onRelease={() => pitchDisplay.current.playSong()}
        style={fastForwardStyle}
      />
    </React.Fragment>
  );
}

export default PitchComponent;
