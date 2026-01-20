import Analytics from './pages/Analytics';
import Board from './pages/Board';
import Boards from './pages/Boards';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Home from './pages/Home';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Income from './pages/Income';
import FinancialOverview from './pages/FinancialOverview';
import Contacts from './pages/Contacts';
import Calendar from './pages/Calendar';
import Gantt from './pages/Gantt';
import Gmail from './pages/Gmail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Board": Board,
    "Boards": Boards,
    "Dashboard": Dashboard,
    "Expenses": Expenses,
    "Home": Home,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Tasks": Tasks,
    "Income": Income,
    "FinancialOverview": FinancialOverview,
    "Contacts": Contacts,
    "Calendar": Calendar,
    "Gantt": Gantt,
    "Gmail": Gmail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};