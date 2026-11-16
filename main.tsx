import {createRoot} from 'react-dom/client';
import WeatherLine from './app/page';
import {InstallSupport} from './components/install-support';
import './app/globals.css';

createRoot(document.getElementById('root')!).render(<><InstallSupport/><WeatherLine/></>);
