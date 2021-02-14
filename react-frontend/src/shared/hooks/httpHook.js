import { useState, useCallback, useRef, useEffect } from 'react';

export const useHttpClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState();

  const activeHttpRequests = useRef([]);

  const sendRequest = useCallback(async (url, method = 'GET', body = null, headers = {}) => {
    setIsLoading(true);
    const httpAborController = new AbortController();
    activeHttpRequests.current.push(httpAborController);
    try {
      const response = await fetch(url, {
        method: method,
        body: body,
        headers: headers,
        signal: httpAborController.signal
      });
  
      const responseData = await response.json();

      activeHttpRequests.current = activeHttpRequests.current.filter(reqCtrl => reqCtrl !== httpAborController);
  
      if (!response.ok) {
        throw new Error (responseData.message);
      }

      setIsLoading(false);
      return responseData;
    } catch (err) {
      setIsError(err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const clearError = () => {
    setIsError(null);
  };

  useEffect(() => {
    return () => {
      activeHttpRequests.current.forEach(abortCtrl => abortCtrl.abort());
    };
  }, []);

  return {
    isLoading: isLoading,
    isError: isError,
    sendRequest: sendRequest,
    clearError: clearError
  };
};