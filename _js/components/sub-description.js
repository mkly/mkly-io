import { Html } from 'mo-js';

export default (() => new Html({

  el: '[x-mkly-sub-description]',
  opacity: {
    0: 1,
    duration: 1000,
    delay: 2900
  }

}).play())();
