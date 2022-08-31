import React from 'react';
import './App.css';
import ListScreen from './screens/ListScreen';
import { BrowserRouter, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={ <ListScreen /> } />
        <Route path=":listId" element={ <ListScreen /> } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
