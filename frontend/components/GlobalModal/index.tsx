import React, { useState, createContext, useContext, ReactElement } from 'react';
import DefaultModal from './DefaultModal';

type GlobalModalContext = {
    showModal: (modal: ReactElement) => void;
    hideModal: () => void;
};

const initalState: GlobalModalContext = {
    showModal: () => {},
    hideModal: () => {},
};

const GlobalModalContext = createContext(initalState);
export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal: React.FC<{}> = ({ children }) => {
    const [modalComponent, setModalComponent] = useState(DefaultModal());

    const showModal = (modal: ReactElement) => {
        setModalComponent(modal);
    };

    const hideModal = () => {
        setModalComponent(DefaultModal());
    };

    return (
    <GlobalModalContext.Provider value={{ showModal, hideModal }}>
        {modalComponent}
        {children}
    </GlobalModalContext.Provider>
    );
};
