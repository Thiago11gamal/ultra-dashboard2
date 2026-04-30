import { useState, useEffect } from 'react';

/**
 * Custom hook that returns the current time, updating every second.
 * @returns {Date} current time
 */
const useClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return time;
};

export default useClock;
