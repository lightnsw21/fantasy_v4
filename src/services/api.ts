import axios from 'axios';
import { FantasySheet } from '../types/fantasy';

const API_URL = 'http://localhost:8000';

export const getFantasySheets = async (): Promise<FantasySheet[]> => {
    const response = await axios.get(`${API_URL}/fantasy-sheets`);
    return response.data;
}; 