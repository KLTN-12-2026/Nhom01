const isAdmin = (s) => {
    if (s === 'MANAGER') {
        return true;
    }

    return false;
}

export default isAdmin