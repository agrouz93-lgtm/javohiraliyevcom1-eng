'use client';

export function Robot({compact=false}:{compact?:boolean}) {
  return <div className={'robot-stage reference-robot'+(compact?' compact':'')}>
    <img src="/usta-robot-transparent.png" alt="Sariq kaskali, yashil ko‘zli USTA PRO quruvchi roboti" className="reference-robot-image" draggable={false}/>
  </div>;
}

