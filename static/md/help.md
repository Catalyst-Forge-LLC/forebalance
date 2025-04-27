You simply enter a line for each credit, debit, or balance reset, and this amazing tool will calculate a projected balance as far into the future as you choose.

The magic happens when you can easily specify a recurring debit (payment, expense, or bill) or credit (paycheck, income, etc). The default data is just to give you an idea of how it works.

Each entry is a single line that has four pipe (|) separated sections: 

```TYPE|WHEN|AMOUNT|DESCRIPTION```

## TYPE - What type of transaction is this entry?
- **B** - Balance as of a certain date
- **C** - Credit on a certain date
- **D** - Debit on a certain date

## WHEN - When does this entry occur and does it recur?

### Single Entry
The specified date for the entry, in `YYYY-MM-DD` format.

### Recurring Entry
Recurring entries can start on a specified date, and then repeat every interval according to the specified interval frequency **(f)** and interval multiple **(m)**, and then repeat indefinitely or for a specified recurrence count **(c)** or through a specified end date. The multiple defaults to 1 and can be omitted. The frequency defaults to month and can also be omitted. If the count is omitted, the entry will recur indefinitely unless there is also a specified end date.

#### Interval Multiple (m):
An integer 1 or greater, defaults to 1;

#### Interval Frequency (f):
- D - Daily
- W - Weekly
- M - monthly (default)
- Y - Yearly

#### Recurrence Count (c):
An integer 1 or greater, defaults to infinity, but practically limited by the forecasting settings;

#### Recurring entry formats:
- repeats indefinitely: `YYYY-MM-DD,Rmf`
    - `2021-04-01,R` - Recurs on the first of every month starting on April 1, 2021.
    - `2021-03-03,RM` - Recurs on the third of every month starting on March 3, 2021.
    - `2021-03-15,R3M` - Recurs on the 15th of every third month (equal to quarterly) starting on March 15, 2021.
    - `2021-01-01,RY` - Recurs yearly on January 1 starting on January 1, 2021.
    - `2021-02-1,R2W` - Recurs every two weeks starting on February 1, 2021.
    - `2021-02-1,RD` - Recurs daily starting on February 1, 2021.
    - `2021-02-10,R2D` - Recurs every other day starting on February 10, 2021.
- repeats a specified count: `YYYY-MM-DD,Rmfc`
    - `2021-02-1,RW5` - Recurs weekly for five weeks starting on February 1, 2021.
    - `2021-02-5,R2M3` - Recurs every other month three times starting on February 5, 2021.
- repeats through a specified end date: `YYYY-MM-DD,Rmf,YYYY-MM-DD`
    - `2021-02-10,R2D,2021-04-10` - Recurs every other day starting on February 10, 2021 and ends on April 10, 2021.
    - `2021-02-1,R,2021-07-01` - Recurs monthly starting on February 1, 2021 and ends on July 1, 2021.

