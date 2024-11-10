import React, { Component } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "./App.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);


class App extends Component {
    state = {
        events: [],
        countries: [],
        subdivisions: [],
        selectedCountry: 'DE',
        selectedSubdivision: '',
        includePublicHolidays: true,
        includeSchoolHolidays: false,
    };

    async componentDidMount() {
        const countries = await fetchCountries();
        this.setState({ countries });
        const subdivisions = await fetchSubdivisions(this.state.selectedCountry);
        this.setState({ subdivisions });
        this.updateEvents(this.state.selectedCountry, this.state.selectedSubdivision, this.state.includePublicHolidays, this.state.includeSchoolHolidays);
    }

    handleCountryChange = async (event) => {
        this.setState({ selectedSubdivision :''})
        const selectedCountry = event.target.value;
        this.setState({ selectedCountry });
        const subdivisions = await fetchSubdivisions(selectedCountry);
        this.setState({ subdivisions });

        this.updateEvents(selectedCountry, this.state.selectedSubdivision, this.state.includePublicHolidays, this.state.includeSchoolHolidays);
    }

    handleSubdivisionChange = async (event) => {
        const selectedSubdivision = event.target.value;
        this.setState({ selectedSubdivision });
        this.updateEvents(this.state.selectedCountry, selectedSubdivision, this.state.includePublicHolidays, this.state.includeSchoolHolidays);
    }

    handlePublicHolidayTypeChange = async (event) => {
        this.state.includePublicHolidays = event.target.checked;
        this.updateEvents(this.state.selectedCountry, this.state.selectedSubdivision, event.target.checked, this.state.includeSchoolHolidays);
    }

    handleSchoolHolidayTypeChange = async (event) => {
        this.state.includeSchoolHolidays = event.target.checked;
        this.updateEvents(this.state.selectedCountry, this.state.selectedSubdivision, this.state.includePublicHolidays, event.target.checked);
    }

    updateEvents = async (countryIsoCode, subdivisionCode, includePublicHolidays, includeSchoolHolidays) => {
        const data = await fetchHolidayData(countryIsoCode, subdivisionCode, includePublicHolidays, includeSchoolHolidays);
        const events = data.map(event => ({
            start: new Date(event.startDate),
            end: new Date(event.endDate),
            title: event.name
        }));
        this.setState({ events });
        console.log(events);
    }

    render() {
        return (
            <div className="App">
                <select onChange={this.handleCountryChange} value={this.state.selectedCountry}>
                    {this.state.countries.map(country => (
                        <option key={country.id} value={country.isoCode}>
                            {country.name}
                        </option>
                    ))}
                </select>
                <select onChange={this.handleSubdivisionChange} value={this.state.selectedSubdivision}>
                    <option value="">Select a subdivision</option>
                    {this.state.subdivisions.map(subdivision => (
                        <option key={subdivision.id} value={subdivision.code}>
                            {subdivision.longName}
                        </option>
                    ))}
                </select>
                <label>
                    <input
                        type="checkbox"
                        defaultChecked={true}
                        checked={this.includePublicHolidays}
                        onChange={this.handlePublicHolidayTypeChange}
                    />
                    Public Holidays
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={this.includeSchoolHolidays}
                        onChange={this.handleSchoolHolidayTypeChange}
                    />
                    School Holidays
                </label>
                <Calendar
                    localizer={localizer}
                    defaultDate={new Date()}
                    defaultView="month"
                    events={this.state.events}
                    style={{ height: "100vh" }}
                />
            </div>
        );
    }
}

async function fetchHolidayData(countryIsoCode, subdivisionCode, includePublicHolidays, includeSchoolHolidays) {
    if (!countryIsoCode) return;
    const response = await fetch('https://localhost:44355/core/api/holiday/getholiday?CountryIsoCode=' +
        `${countryIsoCode}&ValidFrom=2024-01-01&ValidTo=2025-12-31` +
        `${includePublicHolidays ? '&HolidayType=0' : ''}` +
        `${includeSchoolHolidays ? '&HolidayType=1' : ''}` +
        `${subdivisionCode ? '&SubdivisionCode=' + subdivisionCode : ''}`);
    const data = await response.json();
    return data.result;
}

async function fetchCountries() {
    const response = await fetch(`https://localhost:44355/core/api/holiday/getcountry`);
    const data = await response.json();
    return data.result;
}

async function fetchSubdivisions(countryIsoCode) {
    const response = await fetch(`https://localhost:44355/core/api/holiday/getsubdivision?CountryIsoCode=${countryIsoCode}`);
    const data = await response.json();
    return data.result;
}

export default App;
