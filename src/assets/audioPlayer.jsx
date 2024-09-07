import React, { useEffect, useRef } from 'react';

function AudioPlayer({ src, play }) {
  const audioRef = useRef(null);

  useEffect(() => {
    console.log('Audio source:', src);
    if (play) {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [play, src]);

  return <audio ref={audioRef} src={src} />;
}

export default AudioPlayer;
