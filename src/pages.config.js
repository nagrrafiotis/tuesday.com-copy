import Analytics from './pages/Analytics';
import Board from './pages/Board';
import Boards from './pages/Boards';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import FinancialOverview from './pages/FinancialOverview';
import Gantt from './pages/Gantt';
import Gmail from './pages/Gmail';
import Home from './pages/Home';
import Income from './pages/Income';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import ConstructionNotebook from './pages/ConstructionNotebook';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Board": Board,
    "Boards": Boards,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "Expenses": Expenses,
    "FinancialOverview": FinancialOverview,
    "Gantt": Gantt,
    "Gmail": Gmail,
    "Home": Home,
    "Income": Income,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Tasks": Tasks,
    "ConstructionNotebook": ConstructionNotebook,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};