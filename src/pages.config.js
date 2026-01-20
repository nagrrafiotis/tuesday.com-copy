import Analytics from './pages/Analytics';
import Board from './pages/Board';
import Boards from './pages/Boards';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Board": Board,
    "Boards": Boards,
    "Dashboard": Dashboard,
    "Home": Home,
    "Projects": Projects,
    "ProjectDetails": ProjectDetails,
    "Tasks": Tasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};