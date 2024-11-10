import React, { Component } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { FaFilePdf, FaFileExcel } from "react-icons/fa"; // PDF ve Excel ikonları
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

    downloadPDF = () => {
        const doc = new jsPDF();
        doc.text("Holiday List for 2024", 10, 10);
    
        const events2024 = this.state.events.filter(event => 
            event.start >= new Date("2024-01-01") && event.end <= new Date("2024-12-31")
        );
    
        let y = 20; // Başlangıç yüksekliği
        const lineHeight = 10; // Her satırın yüksekliği
        const pageHeight = doc.internal.pageSize.height; // Sayfa yüksekliği
        const margin = 10; // Sayfa kenar boşluğu
    
        events2024.forEach((event, index) => {
            // Yüksekliği kontrol et, sayfa sınırına ulaşıldığında yeni sayfa ekle
            if (y + lineHeight > pageHeight - margin) {
                doc.addPage();
                y = margin; // Yeni sayfada üstten boşluk bırak
            }
            doc.text(
                `${index + 1}. ${event.title} - ${event.start.toDateString()} to ${event.end.toDateString()}`,
                margin,
                y
            );
            y += lineHeight;
        });
    
        doc.save("holidays_2024.pdf");
    };
    
    
    downloadExcel = () => {
        // 2024 yılındaki tüm tatil etkinliklerini filtrele
        const events2024 = this.state.events.filter(event => 
            event.start >= new Date("2024-01-01") && event.end <= new Date("2024-12-31")
        );
    
        const worksheet = XLSX.utils.json_to_sheet(events2024.map(event => ({
            Title: event.title,
            Start: event.start.toDateString(),
            End: event.end.toDateString(),
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays_2024");
        XLSX.writeFile(workbook, "holidays_2024.xlsx");
    };
    
    

    handleCountryChange = async (event) => {
        this.setState({ selectedSubdivision: '' });
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

                {/* PDF ve Excel butonları */}
                <div className="button-group">
                    <button onClick={this.downloadPDF} className="download-button">
                        <FaFilePdf /> Download PDF
                    </button>
                    <button onClick={this.downloadExcel} className="download-button">
                        <FaFileExcel /> Download Excel
                    </button>
                </div>

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
