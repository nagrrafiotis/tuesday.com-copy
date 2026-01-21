import Analytics from './pages/Analytics';
import Board from './pages/Board';
import Boards from './pages/Boards';
import ConstructionNotebook from './pages/ConstructionNotebook';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import FinancialOverview from './pages/FinancialOverview';
import Gantt from './pages/Gantt';
import Home from './pages/Home';
import Income from './pages/Income';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Board": Board,
    "Boards": Boards,
    "ConstructionNotebook": ConstructionNotebook,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "Expenses": Expenses,
    "FinancialOverview": FinancialOverview,
    "Gantt": Gantt,
    "Home": Home,
    "Income": Income,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Settings": Settings,
    "Tasks": Tasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};