import random

def get_computer_choice():
    choices = ['rock', 'paper', 'scissors']
    return random.choice(choices)

def get_user_choice():
    user_input = input("Enter your choice (rock, paper, or scissors): ").lower()
    while user_input not in ['rock', 'paper', 'scissors']:
        user_input = input("Invalid choice. Please enter rock, paper, or scissors: ").lower()
    return user_input

def determine_winner(user_choice, computer_choice):
    if user_choice == computer_choice:
        return "tie"
    elif (user_choice == 'rock' and computer_choice == 'scissors') or \
         (user_choice == 'paper' and computer_choice == 'rock') or \
         (user_choice == 'scissors' and computer_choice == 'paper'):
        return "user"
    else:
        return "computer"

def play_game():
    user_score = 0
    computer_score = 0
    while user_score < 10 and computer_score < 10:
        user_choice = get_user_choice()
        computer_choice = get_computer_choice()
        print(f"\nYou chose: {user_choice}")
        print(f"Computer chose: {computer_choice}")
        winner = determine_winner(user_choice, computer_choice)
        if winner == "user":
            user_score += 1
            print("You win this round!")
        elif winner == "computer":
            computer_score += 1
            print("Computer wins this round!")
        else:
            print("It's a tie!")
        print(f"Score - You: {user_score}, Computer: {computer_score}\n")
    
    if user_score == 10:
        print("Congratulations! You won the game!")
    else:
        print("Computer won the game. Better luck next time!")

if __name__ == "__main__":
    play_game()