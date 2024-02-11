class Npc {
    constructor() {}
}

class PlayerBase {
    constructor(name, isPlayer, game) {
        this.deck = new Array(5);
        this.#initalDeck = new Array(5);
        this.score = 5;
        this.#name = name;
        this.#isPlayer = isPlayer;
        this.game = game;
        this.myTurn = false;
    }

    #initalDeck;
    #name;
    #isPlayer;

    getName() {
        return this.#name;
    }

    getDeck() {
        return JSON.parse(JSON.stringify(this.deck));
    }

    isPlayer() {
        return this.#isPlayer;
    }

    setDeck(deck) {
        this.deck = JSON.parse(JSON.stringify(deck));
        this.#initalDeck = JSON.parse(JSON.stringify(this.deck));
        this.drawHand(this);
    }

    async resetDeck(newDeck = false) {
        if (newDeck && !this.#isPlayer) {
            this.setDeck(await DeckManager.randomDeck());
        } else {
            this.deck = JSON.parse(JSON.stringify(this.#initalDeck));
        }
    }

    drawHand() {
        let html = '';
        for (let i = 0; i < 5; i++) {
            let visibility = !this.#isPlayer ? this.deck[i]?.visibility != undefined ? '-' + this.deck[i].visibility : '' : '';
            html += `<div class="card-slot visibility${visibility}">`;
            html += `<div class="card-slot-lock"><svg viewBox="0 0 448 512" width="100" title="lock">
        <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z" />
      </svg></div>`

            if (this.deck[i] != undefined) {
                html += `<img id="card-${this.#name}#${i}" title="${this.deck[i].name}" src="${this.deck[i].image}"`;
                if (this.#isPlayer) {
                    html += ` draggable="true"`;
                } else {
                    html += ` draggable="false"`;
                }
                html += `>`;
            }
            html += `</div>`;
        }
        document.getElementById(`${this.#name}-hand`).innerHTML = html;
    }

    getCardById(cardId) {
        return {
            ...this.deck[cardId]
        };
    }

    setCardAtId(card, cardId) {
        this.deck[cardId] = {
            ...card
        };
        this.setCardVisibility(cardId, 'visible', this.#isPlayer);
    }

    setCardVisibility(cardId, visibility, force = false) {
        if (!this.#isPlayer || force) {
            this.deck[cardId].visibility = visibility
        }
    }

    // Score     
    resetScore() {
        this.score = 5;
    }

    getScore() {
        let boardScore = 0
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                if (this.game.Board[x][y] == undefined) continue;
                if (this.game.Board[x][y].Owner == this.#name) {
                    boardScore++;
                }
            }
        }
        let cardScore = 0;
        for (let i = 0; i < this.deck.length; i++) {
            if (!this.deck[i].played) cardScore++;
        }

        this.score = boardScore + cardScore;
        return this.score;
    }


    // Lock Card     
    lockAllCard() {
        for (let i = 0; i < this.deck.length; i++) {
            this.deck[i].locked = true;
        }
        this.#drawLockedCard();
    }

    unlockAllCard() {
        for (let i = 0; i < this.deck.length; i++) {
            this.deck[i].locked = false;
        }
        this.#drawLockedCard();
    }

    lockCardAtId(cardId) {
        this.deck[cardId].locked = true;
        this.#drawLockedCard();
    }

    unlockCardAtId(cardId) {
        this.deck[cardId].locked = false;
        this.#drawLockedCard();
    }

    #drawLockedCard() {
        for (let i = 0; i < this.deck.length; i++) {
            let cardSlot = document.getElementById(`card-${this.#name}#${i}`).parentNode;
            if (this.deck[i].locked) {
                cardSlot.classList.add('locked');
            } else {
                cardSlot.classList.remove('locked');
            }
        }
    }

    // Ascension/Descension
    updateCardValue(cardType, modifier) {
        for (let i = 0; i < this.deck.length; i++) {
            if (cardType == this.deck[i].type.id) {
                this.deck[i].stats.modifier = this.deck[i].stats.modifier == undefined ? modifier * 1 : this.deck[i].stats.modifier + modifier * 1;
                this.drawModifier(i, cardType);
            }
        }
    }

    drawModifier(x, cardType) {
        const modifier = document.createElement("div");
        modifier.classList.add('card-modifier');
        modifier.classList.add(cardType);
        modifier.classList.add(this.game._R(this.game.R.Ascension) ? 'asc' : 'desc');
        let card;
        card = document.getElementById(`card-${this.getName()}#${x}`);
        if (this.deck[x].type.id == cardType) {
            modifier.innerHTML = `${this.game._R(this.game.R.Ascension) ? '+' : ''}${this.deck[x].stats.modifier}`;
            card.parentElement.append(modifier);
        }
    }

}

class Player extends PlayerBase {
    constructor(name, game) {
        super(name, true, game);
        this.CurrentCardIndex = 0;
    }

    drawHand() {
        super.drawHand();

        for (let i = 0; i < this.deck.length; i++) {
            let card = document.getElementById(`card-${this.getName()}#${i}`);
            if (card == undefined) continue;
            let self = this
            card.addEventListener("dragstart", function(ev) {
                if (!self.myTurn) {
                    ev.preventDefault();
                    return false;
                }

                const cardIndex = ev.target.id.split('#')[1];
                // drag is allowed of if the card is not locked and unplayed
                if (!self.deck[cardIndex].played && !self.deck[cardIndex].locked) {
                    self.CurrentCardIndex = cardIndex;
                } else {
                    ev.preventDefault();
                }
            }, false);

        }
    }
}

class PC extends PlayerBase {
    constructor(name, game) {
        super(name, false, game);
    }


    pcPlay() {
        this.#possiblePlay();
    }

    #possiblePlay() {
        let possiblePlay = [];
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (this.game.Board[x][y] == undefined) {
                    possiblePlay.push({
                        x: x,
                        y: y,
                        cardAround: this.game.checkAround(x, y)
                    });
                }
            }
        }

        let interestingSquare = possiblePlay.filter(x => x.cardAround.some(y => y && y.Owner != this.name));

        // Fist to play
        if (interestingSquare.length == 0) {
            let defensivePlay = this.#bestDefensivePlay();
            this.game.playCard(defensivePlay.x, defensivePlay.y, defensivePlay.cardId);
        } else {
            let squareValue = [];
            for (let i = 0; i < interestingSquare.length; i++) {
                let possibleCatch = interestingSquare[i].cardAround.filter(x => x != undefined && x.Owner != this.name)

                let playValue = 0;
                for (let i = 0; i < possibleCatch.length; i++) {
                    playValue += this.#getCardValue(possibleCatch[i]);
                };

                squareValue.push({
                    x: interestingSquare[i].x,
                    y: interestingSquare[i].y,
                    value: playValue,
                    card: interestingSquare[i].cardAround
                });
            }


            let listPlay = this.#bestAgresivePlay(squareValue);
            //Check if pc can catch something
            if (listPlay.some(x => {
                    return x.beatsCount > 0;
                })) {
                //can catch something so JUST DO IT! 
                if (listPlay.length > 0) {
                    let bestPlay = listPlay[0];
                    this.game.playCard(listPlay[0].x, listPlay[0].y, listPlay[0].cardId);
                }
            } else {
                //cant catch anything so do a defensive move 
                let defensivePlay = this.#bestDefensivePlay();
                this.game.playCard(defensivePlay.x, defensivePlay.y, defensivePlay.cardId);
            }
        };
    }

    #bestDefensivePlay() {
        //Check enery empty board square
        let possibleDefensifPlay = [];
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (this.game.Board[x][y] != undefined) continue;
                // check every unplayed not locked card in pc hand
                for (let z = 0; z < this.deck.length; z++) {

                    if (this.deck[z].hasOwnProperty('played') && this.deck[z].played || this.deck[z].locked) {
                        continue
                    };
                    let cardAround = this.game.checkAround(x, y);
                    let sideToCheck = new Array(4);
                    if (y >= 1 && cardAround[0] == undefined) {
                        sideToCheck[0] = this.game.getValue(this.deck[z].stats, this.deck[z].stats.numeric.top);
                    }

                    if (x >= 1 && cardAround[1] == undefined) {
                        sideToCheck[1] = this.game.getValue(this.deck[z].stats, this.deck[z].stats.numeric.left);
                    }

                    if (y <= 1 && cardAround[2] == undefined) {
                        sideToCheck[2] = this.game.getValue(this.deck[z].stats, this.deck[z].stats.numeric.bottom);
                    }

                    if (x <= 1 && cardAround[3] == undefined) {
                        sideToCheck[3] = this.game.getValue(this.deck[z].stats, this.deck[z].stats.numeric.right);
                    }
                    let sideValue = 0;
                    let exposedSide = 0;
                    //Count best value
                    for (let a = 0; a < sideToCheck.length; a++) {
                        if (sideToCheck[a] == undefined) continue;
                        sideValue += sideToCheck[a];
                        exposedSide++;
                    }
                    possibleDefensifPlay.push({
                        x: x,
                        y: y,
                        cardId: z,
                        exposedSide: exposedSide,
                        sideValue: sideValue / exposedSide
                    });
                }
            }
        }

        let reverseModifier = this.game._R(this.game.R.Reverse) ? -1 : 1
        possibleDefensifPlay.sort((a, b) => {
            return ((a.sideValue > b.sideValue) * (-1 * reverseModifier) + (a.sideValue < b.sideValue) * (1 * reverseModifier)) + ((a.exposedSide > b.exposedSide) * -1 + (a.exposedSide < b.exposedSide) * 1);
        });


        return possibleDefensifPlay[0];
    }
    #bestAgresivePlay(squareValue) {
        squareValue.sort((a, b) => {
            return b.value - a.value
        });

        let listPlay = [];
        for (let i = 0; i < squareValue.length; i++) {

            //Check the value of the surrounding cards
            let surroundingCardValues = [];
            for (let y = 0; y < 4; y++) {
                let surroundingCard = {
                    numeric: null,
                    formatted: null
                }
                if (squareValue[i].card[y] != undefined && squareValue[i].card[y].Owner != this.getName()) {
                    surroundingCard = {
                        numeric: this.game.getValue(squareValue[i].card[y].stats, squareValue[i].card[y].stats.numeric[Object.keys(squareValue[i].card[y].stats.numeric)[(y + 2) % 4]]),
                        formatted: squareValue[i].card[y].stats.formatted[Object.keys(squareValue[i].card[y].stats.formatted)[(y + 2) % 4]]
                    }
                }
                surroundingCardValues.push(surroundingCard)
            }

            // Check PC hand
            for (let y = 0; y < this.deck.length; y++) {
                if (this.deck[y].hasOwnProperty('played') && this.deck[y].played || this.deck[y].locked) {
                    continue
                };
                // Get the number of card that card can beat
                let beatNb = this.#beatCount(y, surroundingCardValues);

                listPlay.push({
                    x: squareValue[i].x,
                    y: squareValue[i].y,
                    cardId: y,
                    cardValue: this.#getCardValue(this.deck[y]),
                    beatsCount: beatNb
                });
            }
        }

        // Sort to get the best card that beats the most card with the lowest value
        listPlay.sort((a, b) => {
            if (a.beatsCount > b.beatsCount) return -1;
            if (a.beatsCount < b.beatsCount) return 1;


            if (this.game._R(this.game.R.Reverse)) {

                if (a.cardValue > b.cardValue) return -1;
                if (a.cardValue < b.cardValue) return 1;
            } else {
                if (a.cardValue > b.cardValue) return 1;
                if (a.cardValue < b.cardValue) return -1;
            }
        });
        return listPlay;
    }

    #beatCount(cardHandId, surroundingCardValues) {
        let cardStats = this.deck[cardHandId].stats;
        let beatCount = 0;
        let plusArray = new Array(4);

        for (let i = 0; i < surroundingCardValues.length; i++) {
            if (surroundingCardValues[i].numeric == null) continue;

            if (this.game._R(this.game.R.Same)) {
                if (this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) == surroundingCardValues[i].numeric) {
                    beatCount++;
                }
                continue;
            }

            if (this.game._R(this.game.R.Plus)) {
                plusArray[i] = this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) + surroundingCardValues[i].numeric;
                continue;
            }

            if (this.game._R(this.game.R.Reverse)) {
                if (this.game._R(this.game.R.FallenAce) &&
                    ((this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) == 11 && surroundingCardValues[i].numeric == 1) ||
                        (this.game.getValue(cardStats, cardStats.formatted[Object.keys(cardStats.formatted)[i]]) == 'A' && surroundingCardValues[i].numeric == 1))) {
                    beatCount++;
                }
                if (this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) < surroundingCardValues[i].numeric) {
                    beatCount++;
                }
                continue;
            }


            //if (this._R(this.R.Normal)) {
            if (this.game._R(this.game.R.FallenAce) &&
                ((this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) == 1 && surroundingCardValues[i].numeric == 11) ||
                    (this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) == 1 && surroundingCardValues[i].formatted == 'A'))) {
                beatCount++;
                continue;
            }

            if (this.game.getValue(cardStats, cardStats.numeric[Object.keys(cardStats.numeric)[i]]) > surroundingCardValues[i].numeric) {
                beatCount++;
                continue;
            }
            //}


        }
        // count Plus match
        for (let i = 0; i < plusArray.length; i++) {
            if (plusArray[i] == undefined) continue;
            for (let y = 0; y < plusArray.length; y++) {
                if (plusArray[y] == undefined || i == y) continue;
                if (plusArray[i] == plusArray[y]) {
                    beatCount++;
                    break;
                }
            }
        }
        return beatCount;
    }

    #getCardValue(card) {
        return this.game.getValue(card.stats, card.stats.numeric.bottom) +
            this.game.getValue(card.stats, card.stats.numeric.left) +
            this.game.getValue(card.stats, card.stats.numeric.right) +
            this.game.getValue(card.stats, card.stats.numeric.top);
    }
}

class DeckManager {
    constructor(player) {
        this.player = player;
        this.DeckBuilder = [];
        this.Cards = [];
    }

    getCardList() {
        fetch('./json/cards.json')
            .then((r) => r.json())
            .then((data) => {
                this.Cards = data.results;
                for (let i = 0; i < data.count; i++) {
                    this.buildCardList(this.Cards[i]);
                }
                this.buildDeck();
            })
            .catch((e) => ShowError("Error : load card list" + e));
    }

    buildCardList(card) {
        const container = document.getElementById("card-list");
        const cardElement = document.createElement("div");
        cardElement.classList.add("card-container");
        let html = `<div class="card-name">${card.name}</div>`;
        html += `<img id="CardList#${card.id}" class="card-image" onclick="dm.addToDeck('${card.id}')" src="${card.image}">`;
        cardElement.innerHTML = html;
        container.appendChild(cardElement);
    }

    addToDeck(cardId) {
        const card = this.Cards.filter((x) => x.id == cardId);

        // Remove the card from deck if it is already there 
        for (let i = 0; i < this.DeckBuilder.length; i++) {
            if (this.DeckBuilder[i] != undefined && this.DeckBuilder[i].id == cardId) {
                RemoveFromDeck(this.DeckBuilder[i].id)
                return;
            }
        }

        // Add the card to the deck 
        if (card.length > 0) {
            for (let i = 0; i < this.DeckBuilder.length; i++) {
                if (this.DeckBuilder[i] == undefined) {

                    // Check if the card respects the deck building rules
                    const rulesCheck = this.cardOutDeckLimit(card[0], this.DeckBuilder);
                    if (rulesCheck != '') {
                        ShowError(rulesCheck);
                        break;
                    }

                    this.DeckBuilder[i] = card[0];
                    break;
                }
            }
        }

        this.buildDeck();
    }

    cardOutDeckLimit(card, deck) {
        //Five Star Cards: Only one allowed per deck.
        //Four Stars or Higher: Up to two cards per deck.
        //Three Stars or Less: No restrictions.

        if (card.stars <= 3) {
            return '';
        }

        if (card.stars == 5 && deck.some(x => x && x.stars == 5)) {
            return 'Only one five stars card is allowed per deck';
        }

        if (card.stars >= 4 && deck.filter(x => x && x.stars >= 4).length >= 2) {
            return 'Up to two four stats cards or higher are allowed per deck';
        }

        return '';
    }

    removeFromDeck(cardId) {
        const cardIndex = this.DeckBuilder.findIndex(c => c != undefined && c.id == cardId);
        if (cardIndex >= 0) {
            this.DeckBuilder[cardIndex] = undefined;
        }
        this.buildDeck();
    }

    clearDeck() {
        this.DeckBuilder = new Array(5);
        this.buildDeck();
    };

    async startGameDeck() {
        if (this.DeckBuilder.filter(x => x).length == 5) {
            game.Player1.setDeck(this.DeckBuilder);
            game.gameStart();
            ToggleModal('modal-card-list');
        } else {
            ShowError("Error: the deck must contain 5 cards");
        }
    }

    buildDeck() {
        document.querySelectorAll('.card-image.in-deck').forEach(x => x.classList.remove('in-deck'));
        let html = "";
        for (let i = 0; i < this.DeckBuilder.length; i++) {
            html += `<div class="card">`;
            if (this.DeckBuilder[i] != undefined) {
                html += `<div class="card-stats top">${this.DeckBuilder[i].stats.formatted.top}</div>`;
                html += `<div class="card-stats right">${this.DeckBuilder[i].stats.formatted.right}</div>`;
                html += `<div class="card-stats bottom">${this.DeckBuilder[i].stats.formatted.bottom}</div>`;
                html += `<div class="card-stats left">${this.DeckBuilder[i].stats.formatted.left}</div>`;

                html += `<img title="${this.DeckBuilder[i].name}" id="CardDeck#${this.DeckBuilder[i].id}" class="card-image" onClick="dm.removeFromDeck(${this.DeckBuilder[i].id})" src="${this.DeckBuilder[i].image}">`;

                document.getElementById(`CardList#${this.DeckBuilder[i].id}`).classList.add('in-deck');


            }
            html += `</div>`;
        }

        const container = document.getElementById('deck-slot');

        container.innerHTML = html;
    }

    builderDeck() {
        this.DeckBuilder = game.Player1.getDeck();
        this.buildDeck();
    }
    async getRandomDeck() {
        this.clearDeck();
        this.DeckBuilder = await DeckManager.randomDeck();
        this.buildDeck();
    }

    static async randomDeck() {
        let response;
        while (!response || response.status == 404) {
            response = await fetch(`./json/decks.json`, {});
        }
        const json = await response.json();
        return json.results[0].cards;
    };
}


class UIDrawer {
    constructor() {}
    //UI drawing
    async drawGameBoard() {
        //Board array initialization
        this.Board = []
        for (let x = 0; x < 3; x++) {
            this.Board.push(new Array(3));
        }

        this.drawBoard();
        this.Player1.drawHand();
        this.Player2.drawHand();
    };

    drawBoard() {
        const board = document.getElementById('board');
        let html = '';
        for (let y = 0; y < 3; y++) {
            html += '<div class="row">'
            for (let x = 0; x < 3; x++) {
                html += `<div id='${x}|${y}' class="card-slot" ondrop="game.dropCard(event)" ondragover="game.allowDropCard(event)">`;
                html += `</div>`
            }
            html += '</div>'
        }
        board.innerHTML = html;
    };

    allowDropCard(ev) {
        let coordinates = ev.target.id.split('|')
        if (ev.target.id != '' && this.Board[coordinates[0]][coordinates[1]] == undefined) {
            ev.preventDefault();
        }
    }

    dropCard(ev) {
        ev.preventDefault();
        let coordinates = ev.target.id.split('|')

        this.playCard(coordinates[0], coordinates[1], this.PlayerTurn.CurrentCardIndex);
    }

    drawScore() {
        let scoreBoard = document.getElementById('score-board');
        let scoreBoardHTML = ''

        let blueScore = this.Player1.getScore();
        let redScore = this.Player2.getScore();

        for (let i = 0; i < 10; i++) {
            scoreBoardHTML += `<div class="score-board ${blueScore > 0 ? 'score-blue' : 'score-red'}"></div>`
            blueScore--;
        }
        scoreBoard.innerHTML = scoreBoardHTML;
    }

    drawModifier(playedCardTypeId) {
        const modifier = document.createElement("div");
        modifier.classList.add('card-modifier');
        modifier.classList.add(playedCardTypeId);
        modifier.classList.add(this._R(this.R.Ascension) ? 'asc' : 'desc');

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                if (this.Board[x][y] == undefined) continue;
                if (playedCardTypeId == this.Board[x][y].type.id) {

                    let card = document.getElementById(`${x}|${y}`);
                    if (this.Board[x][y].type.id == playedCardTypeId) {
                        modifier.innerHTML = `${this._R(this.R.Ascension) ? '+' : ''}${this.Board[x][y].stats.modifier}`;
                        card.append(modifier);
                    }

                }
            }
        }
    }

    drawGameOver() {
        let p1Score = this.Player1.getScore();
        let p2Score = this.Player2.getScore()
        if (p1Score == p2Score && this._R(this.R.SuddenDeath)) {
            this.gameStart(true);
            return;
        }

        let endMsg = p1Score == p2Score ? 'Draw' : p1Score > p2Score ? 'Victory!' : "You Lose";


        document.getElementById('end-msg').innerHTML = endMsg;
        document.getElementById('end-score').children[0].innerHTML = p1Score;
        document.getElementById('end-score').children[2].innerHTML = p2Score;
        ToggleModal('modal-end-game');
    }

    drawCardInBoard(x, y, playerName) {
        const boardSquare = document.getElementById(`${x}|${y}`);
        const cardInfo = this.Board[x][y];
        const owner = cardInfo.Owner;
        const image = (owner === "red") ? cardInfo.image_red : cardInfo.image_blue;
        const cardHtml = `<img title="${cardInfo.name}" class="card-image card-${owner}-own" src="${image}" draggable="false">`;
        
        boardSquare.classList.add(`card-${playerName}-own`);
        boardSquare.insertAdjacentHTML('beforeend', cardHtml);
    }

    drawCardAsPlayed(playerName,cardId){
        document.getElementById(`card-${playerName}#${cardId}`).classList.add('card-played');
    }

    drawCaptureCard(x, y, player1Name, player2Name, playerTurnName) {
        const boardSquare = document.getElementById(`${x}|${y}`);
        const cardInfo = this.Board[x][y];

        boardSquare.classList.remove(`card-${player1Name}-own`, `card-${player2Name}-own`);
        boardSquare.classList.add(`card-${playerTurnName}-own`);

        boardSquare.children[0].classList.remove(`card-${player1Name}-own`, `card-${player2Name}-own`);
        boardSquare.children[0].classList.add(`card-${playerTurnName}-own`);
        boardSquare.children[0].classList.add('card-capture');

        const image = (playerTurnName === "red") ? cardInfo.image_red : cardInfo.image_blue;
        boardSquare.children[0].src = image;

        setTimeout(() => {
            boardSquare.children[0].classList.remove('card-capture')
        }, 800);
    }
}

class Rule extends UIDrawer {
    constructor() {
        super();
        this.Rules;
        this.R = {
            AllOpen: 1 << 0
        }
    }


    ruleManageVisibilities() {
        //Get tow unique random  Id 
        let rdm = [];
        if (this._R(this.R.ThreeOpen)) {
            while (rdm.length < 2) {
                let r = Random(0, 4);
                if (rdm.indexOf(r) === -1) rdm.push(r);
            }
        }

        for (let i = 0; i < 5; i++) {
            let visibility = 'hidden';
            //Show all
            if (this._R(this.R.AllOpen)) {
                visibility = 'visible';
            }

            //Only show unique random Id
            if (this._R(this.R.ThreeOpen) && !rdm.includes(i)) {
                visibility = 'visible';
            }

            this.Player1.setCardVisibility(i, visibility);
            this.Player2.setCardVisibility(i, visibility);
        }
    }

    async ruleManageBeforeStart() {
        await new Promise(r => setTimeout(r, 250 * this.NoSleep));
        if (this._R(this.R.Swap)) {
            let player1Rdm = Random(0, 3)
            let player2Rdm = Random(0, 3)

            let player1 = document.getElementById(`card-${this.Player1.getName()}#${player1Rdm}`);
            let playerInitPos = [player1.parentNode.offsetTop + player1.offsetTop + 3, player1.parentNode.offsetLeft + player1.offsetLeft + 3];
            player1.style.top = `${playerInitPos[0]}px`;
            player1.style.left = `${playerInitPos[1]}px`;
            player1.classList.add('swap');
            player1.style.top = `${document.getElementById('board').offsetHeight / 2 - 64}px`;
            player1.style.left = `${document.getElementById('board').offsetLeft + document.getElementById('board').offsetWidth / 8}px`;

            let player2 = document.getElementById(`card-${this.Player2.getName()}#${player2Rdm}`);
            let pcInitPos = [player2.parentNode.offsetTop + player2.offsetTop + 3, player2.parentNode.offsetLeft + player2.offsetLeft + 3];
            player2.style.top = `${pcInitPos[0]}px`;
            player2.style.left = `${pcInitPos[1]}px`;
            player2.classList.add('swap');
            player2.style.top = `${document.getElementById('board').offsetHeight / 2 - 64}px`;
            player2.style.left = `${document.getElementById('board').offsetLeft + document.getElementById('board').offsetWidth / 2}px`;

            await new Promise(r => setTimeout(r, 500 * this.NoSleep));
            player1.style.top = `${pcInitPos[0]}px`;
            player1.style.left = `${pcInitPos[1]}px`;

            player2.style.top = `${playerInitPos[0]}px`;
            player2.style.left = `${playerInitPos[1]}px`;



            let player1Card = this.Player1.getCardById(player1Rdm);
            this.Player1.setCardAtId(this.Player2.getCardById(player2Rdm), player1Rdm);
            this.Player2.setCardAtId(player1Card, player2Rdm);

            if (this._R(this.R.Random)) {
                let randomizer = []
                for (let i = 0; i < 10; i++) {
                    if (i < 5) {
                        randomizer.push(`${this.player1.getName()}#${i}`);
                    } else {
                        randomizer.push(`${this.player2.getName()}#${i - 5}`);
                    }
                }

                // Randomize array
                for (let i = randomizer.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [randomizer[i], randomizer[j]] = [randomizer[j], randomizer[i]];
                }


                let tmpP1Deck = this.player1.getDeck();
                let tmpP2deck = this.player2.getDeck();
                for (let i = 0; i < randomizer.length; i++) {
                    let splited = randomizer[i].split('#');
                    let card = splited[0] == this.player1.getName() ? {
                        ...tmpP1Deck[splited[1]]
                    } : {
                        ...tmpP2deck[splited[1]]
                    };
                    if (i < 5) {
                        this.player1.setCardAtId(card, i);
                    } else {
                        this.player2.setCardAtId(card, i);
                        this.Player2.setCardVisibility(i, true);
                    }
                }
            }

            await new Promise(r => setTimeout(r, 300 * this.NoSleep));
            this.drawGameBoard();
        }
    }

    ruleManageCardOrder() {
        //lock every cards in each decks
        if (this._R(this.R.Order) || this._R(this.R.Chaos)) {
            this.Player1.lockAllCard();
            this.Player2.lockAllCard();
        }

        //Manage Order rule
        if (this._R(this.R.Order)) {
            let deck = this.PlayerTurn.getDeck();
            for (let i = 0; i < deck.length; i++) {
                if (deck[i].played) continue;
                this.PlayerTurn.unlockCardAtId(i);
                break;
            }
        }

        //Manage Chaos rule
        if (this._R(this.R.Chaos)) {
            let deck = this.PlayerTurn.getDeck();
            //Unlock random unplayed card
            let cardId;
            while (cardId == undefined) {
                let rdmId = Random(0, 4)
                if (!deck[rdmId].played) {
                    cardId = rdmId;
                }
            }
            this.PlayerTurn.unlockCardAtId(cardId);
        }
    }

    ruleManageAscensionDescension(playedCard) {
        if (this._R(this.R.Ascension) || this._R(this.R.Descension)) {
            if (playedCard.type.id == 0) return;

            let divs = document.getElementsByClassName(`card-modifier ${playedCard.type.id}`);
            for (let i = 0; i < divs.length; ++i) {
                divs[i].remove();
            }
            const modifier = this._R(this.R.Ascension) ? 1 : -1;
            this.Player1.updateCardValue(playedCard.type.id, modifier);
            this.Player2.updateCardValue(playedCard.type.id, modifier);
            this.drawModifier(playedCard.type.id);
        }
    }

    _R(x) {
        return ((this.Rules & x) == x);
    }
}

class Engine extends Rule {
    constructor(debug = false) {
        super();
        this.Board = [];
        this.PlayerTurn;

        this.debug = debug;
        if (debug) {
            this.Player1 = new PC('blue', this);
            this.Player2 = new PC('red', this);
            this.NoSleep = 0;
            this.SkipGameOver = true;
        } else {
            this.Player1 = new Player('blue', this);
            this.Player2 = new PC('red', this);
            this.NoSleep = 1;
            this.SkipGameOver = false;
        }



    }

    async Init() {
        this.drawGameBoard();
        this.Player1.setDeck(await DeckManager.randomDeck());
        this.Player2.setDeck(await DeckManager.randomDeck());
        this.gameStart();
    };

    async beforeRestartGame() {
        await this.Player1.resetDeck(!this.debug);
        await this.Player2.resetDeck(!this.debug);
        await this.gameStart();
    }

    gameCount = 0;
    async gameStart(suddenDeath = false) {
        this.gameCount++;
        console.log(this.gameCount);
        if (suddenDeath) {
            await this.Player1.resetDeck();
            await this.Player2.resetDeck();
        }

        this.ruleManageVisibilities();
        //Draw board      
        this.drawGameBoard();

        //Score
        this.drawScore();

        await this.ruleManageBeforeStart();
        this.nextTurn(true);
    }

    nextTurn(firstTurn = false) {
        if (firstTurn) {
            this.PlayerTurn = Random(0, 1) == 1 ? this.Player1 : this.Player2;
        } else {
            this.PlayerTurn.myTurn = false;
            this.PlayerTurn = this.PlayerTurn.getName() == this.Player1.getName() ? this.Player2 : this.Player1;
        }

        this.PlayerTurn.myTurn = true;
        this.ruleManageCardOrder();
        if (!this.PlayerTurn.isPlayer()) {
            this.PlayerTurn.pcPlay();
        }
    }

    async playCard(x, y, cardId) {
        if (!this.PlayerTurn.isPlayer()) {
            await new Promise(r => setTimeout(r, 750 * this.NoSleep));
        }

        // Board behavior
        this.Board[x][y] = this.PlayerTurn.getCardById(cardId);
        this.Board[x][y].Owner = this.PlayerTurn.getName();
        this.drawCardInBoard(x, y, this.PlayerTurn.getName());

        await this.checkCaptureCard(x, y);

        // Hand behavior
        this.PlayerTurn.deck[cardId].played = true;
        this.drawCardAsPlayed(this.PlayerTurn.getName(), cardId);


        this.drawScore();

        this.ruleManageAscensionDescension(this.PlayerTurn.getCardById(cardId));

        if (!this.gameOver()) {
            this.nextTurn();
        } else {
            await new Promise(r => setTimeout(r, 750 * this.NoSleep));
            if (this.SkipGameOver) {
                this.beforeRestartGame();
            } else {
                this.drawGameOver();
            }
        }
    }

    gameOver() {
        let gameEnded = true;
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                if (this.Board[x][y] == undefined) gameEnded = false;
            }
        }
        return gameEnded;
    }


    //Board 
    checkAround(x, y) {
        let CardAround = new Array(4);
        //Up
        if ((y - 1) >= 0) {
            CardAround[0] = this.Board[x][+y - 1];
        }

        // Right
        if ((+x + 1) < 3) {
            CardAround[1] = this.Board[+x + 1][y];
        }
        //Down
        if ((+y + 1) < 3) {
            CardAround[2] = this.Board[x][+y + 1];
        }
        // Left
        if ((x - 1) >= 0) {
            CardAround[3] = this.Board[+x - 1][y];
        }


        return CardAround;
    }

    async checkCaptureCard(x, y, Combo = false) {
        let cardAround = this.checkAround(x, y);

        let cardStats = [];
        for (let i = 0; i < 4; i++) {
            cardStats.push({
                numeric: this.getValue(this.Board[x][y].stats, this.Board[x][y].stats.numeric[Object.keys(this.Board[x][y].stats.numeric)[i]]),
                formatted: this.Board[x][y].stats.numeric[Object.keys(this.Board[x][y].stats.formatted)[i]]
            });
        }

        let surroundingCardValues = []
        for (let i = 0; i < 4; i++) {
            let surroundingCard = {
                numeric: null,
                formatted: null
            }
            if (cardAround[i] != undefined) {
                surroundingCard = {
                    numeric: this.getValue(cardAround[i].stats, cardAround[i].stats.numeric[Object.keys(cardAround[i].stats.numeric)[(i + 2) % 4]]),
                    formatted: cardAround[i].stats.formatted[Object.keys(cardAround[i].stats.formatted)[(i + 2) % 4]]
                }
            }
            surroundingCardValues.push(surroundingCard)
        }

        let captureCoordinate = [{
                x: +x + 0,
                y: +y - 1
            },
            {
                x: +x + 1,
                y: +y + 0
            },
            {
                x: +x + 0,
                y: +y + 1
            },
            {
                x: +x - 1,
                y: +y + 0
            }
        ];

        let plusArray = new Array(4);
        for (let i = 0; i < cardAround.length; i++) {
            if (cardAround[i] == undefined) continue;
            if (cardAround[i].Owner == this.PlayerTurn.getName()) continue;

            let capture = false;
            if (Combo) {
                if (this._R(this.R.Reverse)) {
                    if (cardStats[i].numeric < surroundingCardValues[i].numeric) {
                        await new Promise(r => setTimeout(r, 500 * this.NoSleep));
                        await this.captureCard(captureCoordinate[i].x, captureCoordinate[i].y);
                    }
                } else {
                    if (cardStats[i].numeric > surroundingCardValues[i].numeric) {
                        await new Promise(r => setTimeout(r, 500 * this.NoSleep));
                        await this.captureCard(captureCoordinate[i].x, captureCoordinate[i].y);
                    }
                }
                continue;
            }


            if (this._R(this.R.FallenAce) &&
                ((cardStats[i].numeric == 1 && surroundingCardValues[i].numeric == 11) ||
                    (cardStats[i].numeric == 1 && surroundingCardValues[i].formatted == 'A'))) {
                capture = true;
            }
            if (cardStats[i].numeric > surroundingCardValues[i].numeric) {
                capture = true;
            }


            if (this._R(this.R.Same)) {
                capture = false;
                if (cardStats[i].numeric == surroundingCardValues[i].numeric) {
                    capture = true;
                }
            }

            if (this._R(this.R.Reverse)) {
                capture = false;
                if (this._R(this.R.FallenAce) &&
                    ((cardStats[i].numeric == 11 && surroundingCardValues[i].numeric == 1) ||
                        (cardStats[i].formatted == 'A' && surroundingCardValues[i].numeric == 1))) {
                    capture = true;
                }
                if (cardStats[i].numeric < surroundingCardValues[i].numeric) {
                    capture = true;
                }
            }

            if (this._R(this.R.Plus)) {
                capture = false;
                plusArray[i] = cardStats[i].numeric + surroundingCardValues[i].numeric;
                continue;
            }

            if (capture) {
                await this.captureCard(captureCoordinate[i].x, captureCoordinate[i].y);
            }
        }


        // Check plus value for Plus rule 
        for (let i = 0; i < plusArray.length; i++) {
            if (plusArray[i] == undefined) continue;
            for (let y = 0; y < plusArray.length; y++) {
                if (plusArray[y] == undefined || i == y) continue;
                if (plusArray[i] == plusArray[y]) {
                    await this.captureCard(captureCoordinate[i].x, captureCoordinate[i].y);
                    break;
                }
            }
        }

    }

    async captureCard(x, y) {
        this.Board[x][y].Owner = this.PlayerTurn.getName();
        this.drawCaptureCard(x, y, this.Player1.getName(), this.Player2.getName(), this.PlayerTurn.getName());


        if (this._R(this.R.Same) || this._R(this.R.Plus)) {
            await this.checkCaptureCard(x, y, true);
        }
    }

    getValue(stats, value) {
        let x = stats.modifier == undefined ? value : value + stats.modifier;
        return Math.min(Math.max(x, 1), 11);
    }
}

let dm = new DeckManager();
dm.getCardList();
let game = new Engine(false);
game.Init();


/*Utilitaire*/
function Random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function ShowError(msg) {
    document.getElementById('error').classList.add('show');
    document.getElementById('error-msg').innerHTML = msg;
    setTimeout(() => {
        document.getElementById('error').classList.remove('show');
    }, 2000);
}

function ToggleModal(modalId, outSide = false) {
    const modal = document.getElementById(modalId);
    if (modal.style.display == "" || modal.style.display == "none") {
        modal.style.display = "block";
        modal.classList.toggle("open-modal");
    } else {
        modal.style.display = "none";
        modal.classList.toggle("open-modal");
        if (modalId == 'modal-end-game') {
            if (outSide) {
                game.beforeRestartGame();
            }
        }
    }
}

window.onclick = (event) => {
    if (event.target.classList.contains("open-modal")) {
        ToggleModal(event.target.id, true);
    }
};