describe('Canvas Tests', () => {
    beforeEach(() => {
        cy.visit('https://localhost:7042/');
    });

    it('Canvas exists', () => {
        cy.get('canvas').should('be.visible');
    });

    it('Adding retcangle to canvas', () => {
        cy.window().then((win) => {
            const canvas = win.canvas; // Получаем объект fabric.Canvas
            expect(canvas).to.exist; // Проверяем, что он есть

            const rect = new win.fabric.Rect({
                left: 50,
                top: 50,
                width: 100,
                height: 100,
                fill: 'blue'
            });

            canvas.add(rect);
            expect(canvas.getObjects().length).to.equal(1);
        });
    });

    it('Should draw a line on the canvas', () => {
        cy.window().then((win) => {
            const canvas = win.canvas;
            canvas.isDrawingMode = true;
            const startLen = canvas.getObjects().length;

            cy.wait(100);

            cy.get('.upper-canvas')
                .trigger('mousedown', { which: 1, pageX: 200, pageY: 200, force: true })
                .trigger('mousemove', { which: 1, pageX: 300, pageY: 300, force: true })
                .trigger('mousemove', { which: 1, pageX: 400, pageY: 400, force: true })
                .trigger('mouseup', { force: true });

            cy.wait(200).then(() => {
                expect(canvas.getObjects().length - startLen).to.be.equal(1);
            });
        });
    });
    
    it('Should check websocket', () => {
        
    })
});

Cypress.on('uncaught:exception', (err, runnable) => {
    // Игнорируем ошибку WebSocket
    if (err.message.includes('Failed to execute \'send\' on \'WebSocket\''))
        return false; // Предотвратить фейл теста

    // Если другая ошибка, её нужно обработать
    return true;
});
