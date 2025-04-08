import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'; // Import the CSS file for styling
import ExportToBlobStorage from './pages/ExportToBlobStorage';
import ScheduleAzureFunction from './pages/ScheduleAzureFunction';
import PushApiAzureSearch from './pages/PushApiAzureSearch';
import ChangeStreamBlobStorage from './pages/ChangeStreamBlobStorage';
import Settings from './pages/Settings';
import TestConnections from './pages/TestConnections';

function App() {
    const [menuOpen, setMenuOpen] = useState(false); // State to toggle the menu

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const closeMenu = () => {
        setMenuOpen(false); // Close the menu
    };

    return (
        <Router>
            <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif' }}>
                {/* Sidebar Menu */}
                <div className={`sidebar ${menuOpen ? 'open' : ''}`}>
                    <h3 className="menu-header">Menu</h3>
                    <ul className="menu-list">
                        <li>
                            <Link to="/export-to-blob-storage" className="menu-link" onClick={closeMenu}>
                                Export to Blob Storage
                            </Link>
                        </li>
                        <li>
                            <Link to="/schedule-azure-function" className="menu-link" onClick={closeMenu}>
                                Schedule Azure Function Trigger
                            </Link>
                        </li>
                        <li>
                            <Link to="/push-api-azure-search" className="menu-link" onClick={closeMenu}>
                                Push API - Azure AI Search - Create Index
                            </Link>
                        </li>
                        <li>
                            <Link to="/change-stream-blob-storage" className="menu-link" onClick={closeMenu}>
                                Change Stream (Blob Storage)
                            </Link>
                        </li>
                        <li>
                            <Link to="/settings" className="menu-link" onClick={closeMenu}>
                                Settings
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Menu Toggle Button */}
                <button
                    onClick={toggleMenu}
                    className="menu-toggle-button"
                >
                    {menuOpen ? 'Close Menu' : 'Open Menu'}
                </button>

                {/* Main Content */}
                <div className="main-content">
                    <Routes>
                        <Route path="/export-to-blob-storage" element={<ExportToBlobStorage />} />
                        <Route path="/schedule-azure-function" element={<ScheduleAzureFunction />} />
                        <Route path="/push-api-azure-search" element={<PushApiAzureSearch />} />
                        <Route path="/change-stream-blob-storage" element={<ChangeStreamBlobStorage />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/test-connections" element={<TestConnections />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
