def getWeather(city: str) -> dict:
    """
    Recupera le condizioni meteo correnti per una città usando Open-Meteo.

    Parameters
    ----------
    city : str
        Nome della città da cercare. Può contenere spazi e caratteri accentati.

    Returns
    -------
    dict
        Dizionario con i dati meteo restituiti:
        - city: nome normalizzato della città
        - country: paese della città
        - latitude: latitudine in gradi decimali
        - longitude: longitudine in gradi decimali
        - temperature: temperatura corrente in °C
        - windspeed: velocità del vento in km/h
        - weathercode: codice meteo Open-Meteo (se disponibile)

    Raises
    ------
    ValueError
        Se `city` è vuoto o contiene solo spazi.
    RuntimeError
        Se la geocodifica fallisce, la città non viene trovata o l'API meteo restituisce dati non validi.

    Examples
    --------
    >>> weather = getWeather("Roma")
    >>> print(weather["city"])
    Roma
    >>> print(weather["temperature"])
    20.5
    """
    raise NotImplementedError("Questa funzione è un placeholder per scopi di documentazione.")
