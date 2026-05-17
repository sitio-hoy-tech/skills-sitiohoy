# Cost Tracking Reference

> Load this on-demand when the user asks about costs or before batch operations.

## Pricing

Image generation costs are **model-dependent**. Consult your provider's pricing documentation for current rates.

General guidance:
- Lower resolution images cost less
- Batch/async APIs often offer discounts (e.g., 50% off)
- Free tiers typically have rate limits (requests per minute/day)

## Cost Tracker Commands

```bash
# Log a generation
cost_tracker.py log --model MODEL --resolution RES --prompt "description"

# View summary (total + last 7 days)
cost_tracker.py summary

# Today's usage
cost_tracker.py today

# Estimate before batch
cost_tracker.py estimate --model MODEL --resolution RES --count N

# Reset ledger
cost_tracker.py reset --confirm
```

## Storage

Ledger stored at `~/.banana/costs.json`. Created automatically on first use.
